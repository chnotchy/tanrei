package io.github.chnotchy.tanrei.components

import android.content.res.Configuration
import android.os.Build
import android.view.View
import androidx.annotation.RequiresApi
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.EnterExitState
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.rememberTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredWidth
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEvent
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.isShiftPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collapse
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.expand
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.max
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupPositionProvider
import androidx.compose.ui.window.PopupProperties
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiInteraction
import io.github.chnotchy.tanrei.primitives.TanreiModalSheetWindow
import io.github.chnotchy.tanrei.primitives.TanreiNamedGlyph
import io.github.chnotchy.tanrei.primitives.TanreiPopupOutsidePress
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiRipple
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiMinimumTouchTarget
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiDatePickerCondition
import io.github.chnotchy.tanrei.tokens.TanreiDatePickerTokens
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldSize
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldVariant
import java.time.LocalDate
import java.util.Locale

/*
 * `specs/date-picker.spec.json` (DTP-1…40) on Compose, as `platforms.compose` maps it: `TanreiDatePicker(visible,
 * onClose, presentation, mode, value, start, end, onChange, min, max, disabledDates, isDateDisabled, today,
 * firstDayOfWeek, locale, entryMode, startView, labels)`. Dates are `TanreiDate` — a year, a month and a day of the
 * Gregorian calendar, with no time and no time zone. `modal` is a `Dialog` window (`TanreiModalSheetWindow`: the window's
 * own dim and animation off, the scrim and the motion Tanrei's), `docked` a focusable `Popup` placed against the anchor's
 * `Box` as `TanreiMenu` is (the menu's placement, `tanreiMenuPosition`). Both are operated overlays: focus moves
 * in when they open and goes back when they close; only the modal one keeps focus in and draws a scrim. The caller keeps
 * the value and closes the picker from `onClose`, which carries the reason.
 *
 * Every design value comes from the current system's [TanreiDatePickerTokens] (`TanreiTheme.tokens.datePicker`). A day,
 * a year and the view toggle are `TanreiButton`'s chain — press and press-hold, pressed feedback and ripple, keyboard focus
 * ring, container, corner smoothing — drawn from `conditions[condition][state]` and `opacity(state)`. The placed
 * components (the navigation and entry-mode icon buttons, Cancel and OK, the text fields) are whole Tanrei components
 * with their own tokens. Days and years are the spec's item kinds, generated by the picker:
 * `TanreiDatePickerDay` and `TanreiDatePickerYear` below. Locale data (names, digits, date forms, the numeric order and
 * the first day of the week) comes from `android.icu` on API 24 and above, `java.text` below (`TanreiDateText`).
 */

// ── Dates ────────────────────────────────────────────────────────────────────

/**
 * A calendar date — a year, a month and a day of the Gregorian calendar, with no time and no time zone, so it never
 * moves by a day. Tanrei's own value class: `java.time.LocalDate` needs API 26 (this package supports 23), and an
 * instant in milliseconds would bring a time zone in. Ordered by date; [toString] is its ISO 8601 form ("2026-09-17").
 *
 * Constructing a date that does not exist (the 31st of September, month 13, year 0) throws; [of] and [parse] answer null
 * instead.
 */
@JvmInline
public value class TanreiDate private constructor(private val packed: Int) : Comparable<TanreiDate> {
    /** The date [year]-[month]-[day]; throws [IllegalArgumentException] when that date does not exist (years 1 to 9999). */
    public constructor(year: Int, month: Int, day: Int) : this(pack(year, month, day))

    /** The year, 1 to 9999. */
    public val year: Int get() = packed / YEAR_FACTOR

    /** The month, 1 (January) to 12. */
    public val month: Int get() = packed / MONTH_FACTOR % MONTHS_PACKED

    /** The day of the month, from 1. */
    public val day: Int get() = packed % MONTH_FACTOR

    override fun compareTo(other: TanreiDate): Int = packed.compareTo(other.packed)

    /** The ISO 8601 calendar date: "2026-09-17". */
    override fun toString(): String = String.format(Locale.ROOT, "%04d-%02d-%02d", year, month, day)

    /** The same date as a `java.time.LocalDate` (API 26 and above). */
    @RequiresApi(Build.VERSION_CODES.O)
    public fun toLocalDate(): LocalDate = LocalDate.of(year, month, day)

    public companion object {
        /** The date [year]-[month]-[day], or null when it does not exist. */
        public fun of(year: Int, month: Int, day: Int): TanreiDate? = if (exists(year, month, day)) TanreiDate(year, month, day) else null

        /** An ISO 8601 calendar date ("2026-09-17": four-digit year, two-digit month and day), or null for anything else. */
        public fun parse(text: String): TanreiDate? {
            val match = ISO_DATE.matchEntire(text) ?: return null
            val (year, month, day) = match.destructured
            return of(year.toInt(), month.toInt(), day.toInt())
        }

        private fun pack(year: Int, month: Int, day: Int): Int {
            require(exists(year, month, day)) { "$year-$month-$day is not a date of the Gregorian calendar (years 1 to 9999)" }
            return year * YEAR_FACTOR + month * MONTH_FACTOR + day
        }

        private fun exists(year: Int, month: Int, day: Int): Boolean =
            year in FIRST_YEAR..LAST_YEAR && month in 1..MONTHS && day in 1..tanreiDaysInMonth(year, month)
    }
}

/**
 * What a date picker's `onChange` carries (the spec's `change`): the new [value] in single mode, or the new [start] and
 * [end] in range mode; the fields of the other mode are null.
 */
@Immutable
public data class TanreiDateSelection(
    public val value: TanreiDate? = null,
    public val start: TanreiDate? = null,
    public val end: TanreiDate? = null,
)

/**
 * The spec's `presentation`. Closed: every value the spec defines is here, so no unknown one can be passed (DTP-40).
 */
public enum class TanreiDatePickerPresentation {
    /** A dialog over a scrim, with a header, text entry and Cancel and OK; OK commits the choice (DTP-1, DTP-6). */
    Modal,

    /** A surface below the product's anchor that the rest of the screen stays usable around; choosing a day commits it (DTP-2, DTP-7). */
    Docked,
}

/** The spec's `mode`. Closed. */
public enum class TanreiDatePickerMode {
    /** One date: `value`. */
    Single,

    /** One contiguous span of dates, from `start` to `end` inclusive. */
    Range,
}

/** The spec's `firstDayOfWeek`: the weekday in the first column. Closed. */
public enum class TanreiDatePickerFirstDayOfWeek {
    /** The locale's first day of the week (Sunday in the United States and Japan, Monday in most of Europe). */
    Locale,
    Sunday,
    Monday,
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday,
}

/** The spec's `entryMode`: how a modal picker opens. Closed. */
public enum class TanreiDatePickerEntryMode {
    /** On the calendar. */
    Calendar,

    /** With text fields to type the date in (modal only; a docked picker has the calendar only, DTP-28). */
    Text,
}

/** The spec's `startView`: whether the calendar opens on the days of a month or on the list of years. Closed. */
public enum class TanreiDatePickerStartView {
    /** The days of a month. */
    Day,

    /** The list of years: for a date far from today, such as a birthday. */
    Year,
}

/**
 * Why the picker asks to be closed (the spec's `close`, DTP-5): its reasons `escape`, `back`, `outside`, `tab`,
 * `focus-out`, `cancel`, `confirm` and `select`, in Kotlin's casing. Only [Confirm] and [Select] follow a commit.
 */
public enum class TanreiDatePickerCloseReason {
    /** Escape. */
    Escape,

    /** The platform's back. */
    Back,

    /** A press on a modal picker's scrim, or outside a docked picker and its anchor. */
    Outside,

    /** Tab or Shift+Tab out of a docked picker: focus then moves on from the anchor as it would have from it. */
    Tab,

    /** Focus left a docked picker's window. */
    FocusOut,

    /** Cancel. */
    Cancel,

    /** OK, after the change it committed (if any). */
    Confirm,

    /** A docked picker's completed choice, after its change (if any). */
    Select,
}

/**
 * Every word the picker shows or announces that is not locale data (DTP-37), with the spec's English defaults. The field
 * names are the spec's props; a product in another language sets them.
 *
 * @property label names the picker: its surface's accessible name, and the line above the chosen date in a modal header.
 * @property dateLabel single mode: the text field's label, and what the header shows while no date is chosen.
 * @property startLabel range mode: the start field's label, the header until a start is chosen, the start day's description.
 * @property endLabel range mode: the end field's label, the header until an end is chosen, the end day's description.
 * @property confirmLabel OK's label.
 * @property cancelLabel Cancel's label.
 * @property previousMonthLabel the previous-month button's accessible name.
 * @property nextMonthLabel the next-month button's accessible name.
 * @property yearViewLabel the view toggle's description (its name is the month and year it shows).
 * @property textEntryLabel the entry-mode toggle's name while the calendar is shown.
 * @property calendarEntryLabel the entry-mode toggle's name while text entry is shown.
 * @property todayLabel read after today's date and the current year (Compose has no current-date property).
 * @property invalidText a field's error when its text is not a date, or its end is before its start.
 * @property unavailableText a field's error when its date is before `min`, after `max` or disabled.
 */
@Immutable
public data class TanreiDatePickerLabels(
    public val label: String = "Select date",
    public val dateLabel: String = "Date",
    public val startLabel: String = "Start date",
    public val endLabel: String = "End date",
    public val confirmLabel: String = "OK",
    public val cancelLabel: String = "Cancel",
    public val previousMonthLabel: String = "Previous month",
    public val nextMonthLabel: String = "Next month",
    public val yearViewLabel: String = "Choose a year",
    public val textEntryLabel: String = "Switch to text entry",
    public val calendarEntryLabel: String = "Switch to calendar",
    public val todayLabel: String = "Today",
    public val invalidText: String = "Enter a valid date",
    public val unavailableText: String = "This date can't be chosen",
)

// ── The picker ───────────────────────────────────────────────────────────────

/**
 * Lets a person choose one date, or one range of dates, from a month calendar or by typing it, in a dialog or in a
 * surface that drops down from a field. Implements `specs/date-picker.spec.json`.
 *
 * A docked picker is placed against the `Box` it is called in — call it inside the anchor's `Box`, as `DropdownMenu`
 * (and `TanreiMenu`). A modal one can be called anywhere.
 *
 * @param visible the spec's `open`. The product opens it and closes it: set it to false when [onClose] asks (DTP-5).
 *   Kept a parameter so that the close motion can run before the window goes.
 * @param onClose the spec's `close`: the picker asks to be closed, and says why ([TanreiDatePickerCloseReason]). Called
 *   once per request, after [onChange] when both are called.
 * @param modifier applied to the picker's surface.
 * @param presentation [TanreiDatePickerPresentation.Modal] (default) or [TanreiDatePickerPresentation.Docked].
 * @param mode [TanreiDatePickerMode.Single] (default: [value]) or [TanreiDatePickerMode.Range] ([start] and [end]).
 * @param value the chosen date in single mode; null for none. Ignored (and reported in debuggable apps) in range mode.
 * @param start the first date of the chosen range in range mode; null for none. Ignored in single mode.
 * @param end the last date of the chosen range, never before [start]; null while only [start] is chosen.
 * @param onChange the spec's `change`: the person committed a choice that differs from [value] (or [start] and [end]) —
 *   by OK in a modal picker, by choosing a day in a docked one. The caller keeps the state (hoisting).
 * @param min the earliest date that can be chosen; null for no limit.
 * @param max the latest date that can be chosen; null for no limit. A [min] after [max] is ignored with it (both).
 * @param disabledDates dates inside [min] and [max] that cannot be chosen (booked, closed).
 * @param isDateDisabled a rule no list can hold (every weekend): true for a date that cannot be chosen. Read with
 *   [disabledDates]; a day is unavailable when either says so.
 * @param today the date drawn as today; null reads the device's current date in its own time zone when the picker opens.
 * @param firstDayOfWeek the weekday in the first column; [TanreiDatePickerFirstDayOfWeek.Locale] (default) takes it
 *   from [locale].
 * @param locale month and weekday names, digits, the numeric date's order and separator and the first day of the week;
 *   null takes `LocalConfiguration`'s first locale. The calendar is the Gregorian calendar in every locale.
 * @param entryMode how a modal picker opens: [TanreiDatePickerEntryMode.Calendar] (default) or text entry.
 * @param startView [TanreiDatePickerStartView.Day] (default) or the year list.
 * @param labels every word the picker shows or announces, with English defaults.
 */
@Composable
public fun TanreiDatePicker(
    visible: Boolean,
    onClose: (TanreiDatePickerCloseReason) -> Unit,
    modifier: Modifier = Modifier,
    presentation: TanreiDatePickerPresentation = TanreiDatePickerPresentation.Modal,
    mode: TanreiDatePickerMode = TanreiDatePickerMode.Single,
    value: TanreiDate? = null,
    start: TanreiDate? = null,
    end: TanreiDate? = null,
    onChange: (TanreiDateSelection) -> Unit = {},
    min: TanreiDate? = null,
    max: TanreiDate? = null,
    disabledDates: Set<TanreiDate> = emptySet(),
    isDateDisabled: ((TanreiDate) -> Boolean)? = null,
    today: TanreiDate? = null,
    firstDayOfWeek: TanreiDatePickerFirstDayOfWeek = TanreiDatePickerFirstDayOfWeek.Locale,
    locale: Locale? = null,
    entryMode: TanreiDatePickerEntryMode = TanreiDatePickerEntryMode.Calendar,
    startView: TanreiDatePickerStartView = TanreiDatePickerStartView.Day,
    labels: TanreiDatePickerLabels = TanreiDatePickerLabels(),
) {
    val props = DatePickerProps(presentation, mode, value, start, end, min, max, disabledDates, isDateDisabled, today, firstDayOfWeek, locale, entryMode, startView, labels)
    val tokens = TanreiTheme.tokens.datePicker
    val state = remember { MutableTransitionState(false) }
    state.targetState = visible
    val close by rememberUpdatedState(onClose)
    val change by rememberUpdatedState(onChange)
    val open by rememberUpdatedState(visible)
    // DTP-5: Tab and Shift+Tab move on from the anchor once a docked picker is gone. The anchor kept its focus in this
    // window while the popup held focus in its own (DTP-4).
    val pending = remember { DatePickerPendingMove() }
    val focusManager = LocalFocusManager.current
    val gone = !state.currentState && !state.targetState
    LaunchedEffect(gone) {
        if (gone) pending.direction?.let { focusManager.moveFocus(it) }
        pending.direction = null
    }
    if (gone) return
    val request: (TanreiDatePickerCloseReason, FocusDirection?) -> Unit = { reason, move ->
        if (open) {
            pending.direction = move
            close(reason)
        }
    }
    when (presentation) {
        TanreiDatePickerPresentation.Modal -> {
            // DTP-1: a Dialog window over everything, the window under it inert and hidden; DTP-5: the platform's back.
            TanreiModalSheetWindow(onBack = { request(TanreiDatePickerCloseReason.Back, null) }, backEnabled = true) {
                val shown = rememberTanreiDatePickerShown(state, tokens, modal = true)
                TanreiDatePickerModalArea(
                    props = props,
                    onClose = request,
                    onChange = { change(it) },
                    modifier = modifier,
                    shown = { shown.value },
                    entering = state.targetState,
                    moveFocusIn = true,
                )
            }
        }
        TanreiDatePickerPresentation.Docked -> TanreiDatePickerPopup(props, state, request, { change(it) }, modifier)
    }
}

/** Which way Tab moves on from the anchor once a docked picker has closed. */
private class DatePickerPendingMove {
    var direction: FocusDirection? = null
}

/** The props of one picker, as the spec names them (the Compose types). */
@Immutable
internal data class DatePickerProps(
    val presentation: TanreiDatePickerPresentation = TanreiDatePickerPresentation.Modal,
    val mode: TanreiDatePickerMode = TanreiDatePickerMode.Single,
    val value: TanreiDate? = null,
    val start: TanreiDate? = null,
    val end: TanreiDate? = null,
    val min: TanreiDate? = null,
    val max: TanreiDate? = null,
    val disabledDates: Set<TanreiDate> = emptySet(),
    val isDateDisabled: ((TanreiDate) -> Boolean)? = null,
    val today: TanreiDate? = null,
    val firstDayOfWeek: TanreiDatePickerFirstDayOfWeek = TanreiDatePickerFirstDayOfWeek.Locale,
    val locale: Locale? = null,
    val entryMode: TanreiDatePickerEntryMode = TanreiDatePickerEntryMode.Calendar,
    val startView: TanreiDatePickerStartView = TanreiDatePickerStartView.Day,
    val labels: TanreiDatePickerLabels = TanreiDatePickerLabels(),
)

/**
 * DTP-22's timing: how far the picker is shown, 0 to 1 — rising over the open duration with the open easing while
 * [state] opens, falling over the close duration with the close easing while it closes ([modal]: the `modal.motion.*`
 * tokens, else `docked.motion.*`); at once where motion is reduced (Android's setting — the animator duration scale —
 * removes every animation, this one included).
 */
@Composable
internal fun rememberTanreiDatePickerShown(state: MutableTransitionState<Boolean>, tokens: TanreiDatePickerTokens, modal: Boolean): State<Float> {
    val transition = rememberTransition(state, label = "date-picker")
    return transition.animateFloat(
        transitionSpec = {
            when {
                modal && targetState -> tanreiTween(tokens.modalMotionOpenDuration, tokens.modalMotionOpenEasing)
                modal -> tanreiTween(tokens.modalMotionCloseDuration, tokens.modalMotionCloseEasing)
                targetState -> tanreiTween(tokens.dockedMotionOpenDuration, tokens.dockedMotionOpenEasing)
                else -> tanreiTween(tokens.dockedMotionCloseDuration, tokens.dockedMotionCloseEasing)
            }
        },
        label = "shown",
    ) { open -> if (open) 1f else 0f }
}

/**
 * The picker as it is drawn while open, in place — no window, no popup, no motion, no focus move: the test-only harness
 * of DTP-1's `verify` that the baselines and most behaviour tests draw. A modal picker draws its scrim over everything
 * it is given and centres its surface in it (the 480 × 640 stage); a docked one draws its surface at its natural size,
 * [maxHeight] (pixels) standing for the room a popup would leave, the width it is given for the window's (DTP-38). It is fully operable.
 */
@Composable
internal fun TanreiDatePickerContent(
    modifier: Modifier = Modifier,
    props: DatePickerProps = DatePickerProps(),
    onClose: (TanreiDatePickerCloseReason) -> Unit = {},
    onChange: (TanreiDateSelection) -> Unit = {},
    maxHeight: Int = Int.MAX_VALUE,
) {
    val close by rememberUpdatedState(onClose)
    val change by rememberUpdatedState(onChange)
    if (props.presentation == TanreiDatePickerPresentation.Modal) {
        TanreiDatePickerModalArea(props, { reason, _ -> close(reason) }, { change(it) }, modifier, shown = { 1f }, entering = true, moveFocusIn = false)
    } else {
        DatePickerWithinWidth { widest ->
            TanreiDatePickerBody(props, { reason, _ -> close(reason) }, { change(it) }, modifier, maxHeight = maxHeight, widest = widest, moveFocusIn = false, onFocusOut = null)
        }
    }
}

// ── The modal presentation (DTP-1, DTP-22) ───────────────────────────────────

/**
 * DTP-1: the scrim over everything it is given (`modal.scrim.color`, fading with [shown]; a press on it is `Outside`),
 * and the surface centred in the safe area, `modal.container.margin` from every edge and from the keyboard (on a narrow
 * window the margins give way first, then the padding, then the cells — DTP-38), fading with [shown] and — while [entering] — growing about its centre from `modal.motion.enter-scale` (DTP-22).
 */
@Composable
internal fun TanreiDatePickerModalArea(
    props: DatePickerProps,
    onClose: (TanreiDatePickerCloseReason, FocusDirection?) -> Unit,
    onChange: (TanreiDateSelection) -> Unit,
    modifier: Modifier,
    shown: () -> Float,
    entering: Boolean,
    moveFocusIn: Boolean,
) {
    val tokens = TanreiTheme.tokens.datePicker
    val scrim = tokens.modalScrimColor.color
    val close by rememberUpdatedState(onClose)
    Box(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer { alpha = shown().coerceIn(0f, 1f) }
                .drawBehind { if (scrim.isDrawn) drawRect(scrim) }
                .pointerInput(Unit) { detectTapGestures { close(TanreiDatePickerCloseReason.Outside, null) } }
                .clearAndSetSemantics {},
        )
        BoxWithConstraints(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing)) {
            // DTP-38: the widest the surface may be is the safe area with no margins; the room's height keeps them.
            val widest = constraints.maxWidth
            val margin = with(LocalDensity.current) { tokens.modalContainerMargin.roundToPx() }
            val room = (constraints.maxHeight - margin * 2).coerceAtLeast(0)
            Box(Modifier.fillMaxSize().padding(tokens.modalContainerMargin), contentAlignment = Alignment.Center) {
                TanreiDatePickerBody(
                    props = props,
                    onClose = onClose,
                    onChange = onChange,
                    modifier = modifier.graphicsLayer {
                        val value = shown().coerceIn(0f, 1f)
                        alpha = value
                        // Grows about its centre while it enters; it only fades as it leaves.
                        val scale = if (entering) tokens.modalMotionEnterScale + (1f - tokens.modalMotionEnterScale) * value else 1f
                        scaleX = scale
                        scaleY = scale
                    },
                    maxHeight = room,
                    widest = widest,
                    moveFocusIn = moveFocusIn,
                    onFocusOut = null,
                )
            }
        }
    }
}

// ── The docked presentation (DTP-2, DTP-5, DTP-22) ───────────────────────────

/** Where the popup is: the menu's position (side, room), and the anchor's bounds in its window. */
@Stable
internal class DockedPosition {
    val menu = MenuPosition()
    var anchor: IntRect = IntRect.Zero
}

/**
 * DTP-2: the menu's placement at `bottom-start`, `docked.offset` from the anchor, `docked.viewport-margin` inside the
 * window. DTP-38: a surface wider than the window less its margins is centred in the window — the margins give way
 * first, as a modal picker's do — and the surface, narrowed to the window, never leaves it.
 */
internal class DockedPositionProvider(offset: Int, private val margin: Int, private val position: DockedPosition) : PopupPositionProvider {
    private val menu = TanreiMenuPositionProvider(TanreiMenuPlacement.BottomStart, offset, margin, position.menu)

    override fun calculatePosition(anchorBounds: IntRect, windowSize: IntSize, layoutDirection: LayoutDirection, popupContentSize: IntSize): IntOffset {
        position.anchor = anchorBounds
        val placed = menu.calculatePosition(anchorBounds, windowSize, layoutDirection, popupContentSize)
        if (popupContentSize.width <= windowSize.width - margin * 2) return placed
        return placed.copy(x = ((windowSize.width - popupContentSize.width) / 2).coerceAtLeast(0))
    }
}

@Composable
private fun TanreiDatePickerPopup(
    props: DatePickerProps,
    state: MutableTransitionState<Boolean>,
    onClose: (TanreiDatePickerCloseReason, FocusDirection?) -> Unit,
    onChange: (TanreiDateSelection) -> Unit,
    modifier: Modifier,
) {
    val tokens = TanreiTheme.tokens.datePicker
    val density = LocalDensity.current
    val host = LocalView.current
    val close by rememberUpdatedState(onClose)
    val position = remember { DockedPosition() }
    val provider = remember(tokens.dockedOffset, tokens.dockedViewportMargin, density) {
        DockedPositionProvider(with(density) { tokens.dockedOffset.roundToPx() }, with(density) { tokens.dockedViewportMargin.roundToPx() }, position)
    }
    Popup(
        popupPositionProvider = provider,
        // DTP-5: a press outside the surface (and the anchor) closes it; the Popup consumes that press.
        onDismissRequest = { close(TanreiDatePickerCloseReason.Outside, null) },
        properties = PopupProperties(focusable = true, dismissOnBackPress = false, dismissOnClickOutside = true),
    ) {
        val shown = rememberTanreiDatePickerShown(state, tokens, modal = false)
        val opening = state.targetState
        // DTP-5: a press on the anchor is not a press outside the picker AND its anchor: it is taken, and nothing closes.
        TanreiPopupOutsidePress { screen -> screen in position.anchorOnScreen(host) }
        // DTP-38: the popup's content is measured within the window; the surface narrows to it, never past it.
        DatePickerWithinWidth { widest ->
            TanreiDatePickerBody(
                props = props,
                onClose = onClose,
                onChange = onChange,
                modifier = modifier.graphicsLayer {
                    val value = shown.value.coerceIn(0f, 1f)
                    alpha = value
                    // DTP-22: grows only while opening, from the edge that faces the anchor; a closing picker only fades.
                    scaleY = if (opening) value else 1f
                    transformOrigin = TransformOrigin(pivotFractionX = 0.5f, pivotFractionY = if (position.menu.below) 0f else 1f)
                },
                maxHeight = position.menu.room,
                widest = widest,
                moveFocusIn = true,
                onFocusOut = { close(TanreiDatePickerCloseReason.FocusOut, null) },
            )
        }
    }
}

/** The anchor's bounds on the screen, from its bounds in the host window. */
private fun DockedPosition.anchorOnScreen(host: View): androidx.compose.ui.geometry.Rect {
    val location = IntArray(2).also { host.getLocationOnScreen(it) }
    return androidx.compose.ui.geometry.Rect(
        (anchor.left + location[0]).toFloat(),
        (anchor.top + location[1]).toFloat(),
        (anchor.right + location[0]).toFloat(),
        (anchor.bottom + location[1]).toFloat(),
    )
}

private operator fun androidx.compose.ui.geometry.Rect.contains(point: Offset): Boolean = point.x >= left && point.x < right && point.y >= top && point.y < bottom

// ── Configuration: the props read once, what is ignored reported (DTP-40) ────

/** A condition of a day or a year (DTP-10), from the generated open key. */
private val Unselected = TanreiDatePickerCondition.Unselected
private val Today = TanreiDatePickerCondition.Today
private val Selected = TanreiDatePickerCondition.Selected
private val InRange = TanreiDatePickerCondition.InRange

/** A month of a year. */
@Immutable
internal data class TanreiCalendarMonth(val year: Int, val month: Int) : Comparable<TanreiCalendarMonth> {
    private val index: Int get() = year * MONTHS + (month - 1)

    override fun compareTo(other: TanreiCalendarMonth): Int = index.compareTo(other.index)

    operator fun plus(months: Int): TanreiCalendarMonth {
        val next = index + months
        return TanreiCalendarMonth(Math.floorDiv(next, MONTHS), Math.floorMod(next, MONTHS) + 1)
    }

    val first: TanreiDate get() = TanreiDate(year, month, 1)
    val length: Int get() = tanreiDaysInMonth(year, month)

    operator fun contains(date: TanreiDate?): Boolean = date != null && date.year == year && date.month == month
}

internal val TanreiDate.calendarMonth: TanreiCalendarMonth get() = TanreiCalendarMonth(year, month)

/** What the picker reads from its props (DTP-29, DTP-37, DTP-40): validated, with the problems a debuggable app hears. */
internal class DatePickerConfig(
    val presentation: TanreiDatePickerPresentation,
    val mode: TanreiDatePickerMode,
    val entryMode: TanreiDatePickerEntryMode,
    val startView: TanreiDatePickerStartView,
    /** The first column's weekday, 0 (Sunday) to 6. */
    val firstDay: Int,
    val text: TanreiDateText,
    val min: TanreiDate?,
    val max: TanreiDate?,
    val today: TanreiDate,
    /** The committed choice the props name, normalised to the mode. */
    val committed: TanreiDateSelection,
    val disabledDates: Set<TanreiDate>,
    val isDateDisabled: ((TanreiDate) -> Boolean)?,
    val labels: TanreiDatePickerLabels,
    val reports: List<String>,
) {
    val docked: Boolean get() = presentation == TanreiDatePickerPresentation.Docked
    val single: Boolean get() = mode == TanreiDatePickerMode.Single

    /** DTP-29: before min, after max, listed, or named by the predicate. */
    fun unavailable(date: TanreiDate): Boolean =
        (min != null && date < min) || (max != null && date > max) || date in disabledDates || isDateDisabled?.invoke(date) == true

    /** The years of the year view (DTP-16): min's to max's, 1900 and 2100 for an empty side. */
    val firstYear: Int get() = min?.year ?: FIRST_LISTED_YEAR
    val lastYear: Int get() = max?.year ?: LAST_LISTED_YEAR

    fun clamp(date: TanreiDate): TanreiDate = when {
        min != null && date < min -> min
        max != null && date > max -> max
        else -> date
    }

    fun clamp(month: TanreiCalendarMonth): TanreiCalendarMonth = when {
        min != null && month < min.calendarMonth -> min.calendarMonth
        max != null && month > max.calendarMonth -> max.calendarMonth
        else -> month
    }
}

/** DTP-40: every prop read, what cannot be used ignored and reported. Pure: the composable wrapper supplies the locale. */
internal fun readDatePickerConfig(props: DatePickerProps, text: TanreiDateText, openedToday: TanreiDate): DatePickerConfig {
    val reports = mutableListOf<String>()
    var min = props.min
    var max = props.max
    if (min != null && max != null && min > max) {
        reports += "TanreiDatePicker: min $min is after max $max; both are ignored."
        min = null
        max = null
    }
    var value = props.value
    var start = props.start
    var end = props.end
    val single = props.mode == TanreiDatePickerMode.Single
    if (!single && value != null) {
        reports += "TanreiDatePicker: value $value is set in range mode, whose choice is start and end; it is ignored."
        value = null
    }
    if (single && (start != null || end != null)) {
        reports += "TanreiDatePicker: start or end is set in single mode, whose choice is value; they are ignored."
        start = null
        end = null
    }
    if (start != null && end != null && end < start) {
        reports += "TanreiDatePicker: end $end is before start $start; the end is ignored."
        end = null
    }
    if (end != null && start == null) {
        reports += "TanreiDatePicker: end $end is set without a start; it is ignored."
        end = null
    }
    if (props.presentation == TanreiDatePickerPresentation.Docked && props.entryMode == TanreiDatePickerEntryMode.Text) {
        reports += "TanreiDatePicker: a docked picker has the calendar only; entryMode Text is ignored (DTP-28)."
    }
    val firstDay = when (props.firstDayOfWeek) {
        TanreiDatePickerFirstDayOfWeek.Locale -> text.firstDayOfWeek
        else -> props.firstDayOfWeek.ordinal - 1
    }
    return DatePickerConfig(
        presentation = props.presentation,
        mode = props.mode,
        entryMode = if (props.presentation == TanreiDatePickerPresentation.Docked) TanreiDatePickerEntryMode.Calendar else props.entryMode,
        startView = props.startView,
        firstDay = firstDay,
        text = text,
        min = min,
        max = max,
        today = props.today ?: openedToday,
        committed = if (single) TanreiDateSelection(value = value) else TanreiDateSelection(start = start, end = end),
        disabledDates = props.disabledDates,
        isDateDisabled = props.isDateDisabled,
        labels = props.labels,
        reports = reports,
    )
}

/** DTP-37: the device's current date in its own time zone. */
internal fun tanreiDeviceToday(): TanreiDate {
    val now = java.util.Calendar.getInstance()
    return TanreiDate(now.get(java.util.Calendar.YEAR), now.get(java.util.Calendar.MONTH) + 1, now.get(java.util.Calendar.DAY_OF_MONTH))
}

private val Configuration.primaryDateLocale: Locale
    get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) locales[0] else @Suppress("DEPRECATION") locale

/** Debuggable apps only: each problem once per composition site (DTP-28, DTP-40). */
@Composable
private fun TanreiReportDatePickerProblems(problems: List<String>) {
    if (!isTanreiDebuggable()) return
    for (problem in problems) remember(problem) { TanreiDiagnostics.reporter(problem) }
}

// ── The session: what the picker holds while it is open ─────────────────────

/** A field's error (DTP-26): text that is not a date (or an end before its start), or a date that cannot be chosen. */
internal enum class DatePickerFieldError { Invalid, Unavailable }

/** What a field's text reads as (DTP-26). */
private sealed interface FieldStatus {
    data object Empty : FieldStatus
    data class Date(val date: TanreiDate) : FieldStatus
    data class Error(val error: DatePickerFieldError) : FieldStatus
}

/**
 * One opening of the picker: its pending choice (DTP-6), the month and view it shows, the active day (DTP-17), the
 * focused year, the fields' texts and errors, and the focus requests of its parts. Created when the picker opens, so a
 * value the product sets while a modal picker is open changes nothing.
 */
@Stable
internal class DatePickerSession(config: DatePickerConfig) {
    /** The committed choice the picker opened with (DTP-6: OK emits change only when the pending choice differs). */
    val openedWith: TanreiDateSelection = config.committed
    var pending: TanreiDateSelection by mutableStateOf(config.committed)
    var entry: TanreiDatePickerEntryMode by mutableStateOf(config.entryMode)
    var view: TanreiDatePickerStartView by mutableStateOf(config.startView)
    var shown: TanreiCalendarMonth by mutableStateOf(openingMonth(config, config.committed))
    var active: TanreiDate by mutableStateOf(activeDayOf(shown, config.committed, config))
    var focusedYear: Int by mutableIntStateOf(shown.year)
    val texts = mutableStateListOf(fieldText(config, config.committed.value ?: config.committed.start), fieldText(config, config.committed.end))
    val errors = mutableStateListOf<DatePickerFieldError?>(null, null)

    /** The part that has focus now (`day`, `year`, `view-toggle` …): the docked picker's Tab reads it. Never drawn. */
    var focusedPart: String? = null

    /** The part focus is asked to move to, after the frame that composes it. */
    var focusRequest: Pair<String, Int>? by mutableStateOf(null)
    private var requests = 0
    private val requesters = HashMap<String, FocusRequester>()

    fun requester(key: String): FocusRequester = requesters.getOrPut(key) { FocusRequester() }

    fun focus(key: String) {
        focusRequest = key to ++requests
    }

    /** The part focus moves to when the picker opens (DTP-3): the first field, the displayed year, or the active day. */
    val openingTarget: String
        get() = when {
            entry == TanreiDatePickerEntryMode.Text -> FIELD_KEYS[0]
            view == TanreiDatePickerStartView.Year -> yearKey(shown.year)
            else -> dayKey(active)
        }
}

private fun dayKey(date: TanreiDate) = "day:$date"
private fun yearKey(year: Int) = "year:$year"
private const val VIEW_TOGGLE_KEY = "view-toggle"
private const val PREVIOUS_KEY = "previous"
private const val NEXT_KEY = "next"
private const val ENTRY_TOGGLE_KEY = "entry-toggle"
private val FIELD_KEYS = listOf("field:0", "field:1")

/** A field's text for [date] (DTP-26: the locale's numeric form), empty for none. */
private fun fieldText(config: DatePickerConfig, date: TanreiDate?): String = date?.let { config.text.numericDate(it) } ?: ""

/** DTP-29: the month a picker opens on — the chosen date's or start's, otherwise today's, between min's and max's months. */
internal fun openingMonth(config: DatePickerConfig, choice: TanreiDateSelection): TanreiCalendarMonth =
    config.clamp((choice.value ?: choice.start ?: config.today).calendarMonth)

/**
 * DTP-17: the active day of a month that is shown — the chosen date (start) when it lies in it, otherwise today when it
 * does, otherwise its first available day, otherwise its first day.
 */
internal fun activeDayOf(month: TanreiCalendarMonth, choice: TanreiDateSelection, config: DatePickerConfig): TanreiDate {
    val chosen = choice.value ?: choice.start
    if (chosen != null && chosen in month) return chosen
    if (config.today in month) return config.today
    val days = (1..month.length).map { TanreiDate(month.year, month.month, it) }
    return days.firstOrNull { !config.unavailable(it) } ?: days.first()
}

/**
 * DTP-10: the one condition a day is drawn from, by precedence — selected (the date, or a range's start or end) over
 * in-range (strictly between them) over today over unselected.
 */
internal fun tanreiDayCondition(day: TanreiDate, choice: TanreiDateSelection, today: TanreiDate): TanreiDatePickerCondition {
    val start = choice.start
    val end = choice.end
    return when {
        day == choice.value || day == start || day == end -> Selected
        start != null && end != null && day > start && day < end -> InRange
        day == today -> Today
        else -> Unselected
    }
}

/** DTP-10: a year of the year view — selected for the displayed year, today for the current one, otherwise unselected. */
internal fun tanreiYearCondition(year: Int, shownYear: Int, today: TanreiDate): TanreiDatePickerCondition = when (year) {
    shownYear -> Selected
    today.year -> Today
    else -> Unselected
}

/**
 * DTP-8 / DTP-9: the choice after [day] is chosen — single mode: the date; range mode: the start (the end cleared) when
 * no start is chosen, both are, or the day is before the start, and otherwise the end.
 */
internal fun tanreiChoose(choice: TanreiDateSelection, day: TanreiDate, single: Boolean): TanreiDateSelection {
    if (single) return TanreiDateSelection(value = day)
    val start = choice.start
    val restart = start == null || choice.end != null || day < start
    return if (restart) TanreiDateSelection(start = day) else TanreiDateSelection(start = start, end = day)
}

/**
 * DTP-18: where an arrow key, Home, End, Page Up or Page Down moves the active day [from] (null for another key):
 * Right and Left one day in the direction the arrow points ([rtl] mirrors them), Down and Up a week, Home and End the
 * ends of its week row ([firstDay] starts it), Page Down and Up a month and with [shift] a year (the last day of a
 * shorter month); never before [min] or after [max].
 */
internal fun tanreiDayKeyTarget(key: Key, shift: Boolean, from: TanreiDate, rtl: Boolean, firstDay: Int, min: TanreiDate?, max: TanreiDate?): TanreiDate? {
    val forward = if (rtl) -1 else 1
    val column = Math.floorMod(from.weekday - firstDay, DAYS_IN_WEEK)
    val next = when (key) {
        Key.DirectionRight -> from.plusDays(forward)
        Key.DirectionLeft -> from.plusDays(-forward)
        Key.DirectionDown -> from.plusDays(DAYS_IN_WEEK)
        Key.DirectionUp -> from.plusDays(-DAYS_IN_WEEK)
        Key.MoveHome -> from.plusDays(-column)
        Key.MoveEnd -> from.plusDays(DAYS_IN_WEEK - 1 - column)
        Key.PageDown -> from.plusMonths(if (shift) MONTHS else 1)
        Key.PageUp -> from.plusMonths(if (shift) -MONTHS else -1)
        else -> return null
    }
    return when {
        min != null && next < min -> min
        max != null && next > max -> max
        else -> next
    }
}

/** DTP-19: where an arrow key, Home or End moves the focused year [from] in the year list; null for another key. */
internal fun tanreiYearKeyTarget(key: Key, from: Int, rtl: Boolean, first: Int, last: Int): Int? {
    val forward = if (rtl) -1 else 1
    val next = when (key) {
        Key.DirectionRight -> from + forward
        Key.DirectionLeft -> from - forward
        Key.DirectionDown -> from + YEARS_PER_ROW
        Key.DirectionUp -> from - YEARS_PER_ROW
        Key.MoveHome -> first
        Key.MoveEnd -> last
        else -> return null
    }
    return next.coerceIn(first, last)
}

/** The picker's operations on a session, with the config and the callbacks of this composition. */
private class DatePickerActions(
    val config: DatePickerConfig,
    val session: DatePickerSession,
    val close: (TanreiDatePickerCloseReason, FocusDirection?) -> Unit,
    val change: (TanreiDateSelection) -> Unit,
    val announce: (String) -> Unit,
) {
    private val single = config.single

    /** DTP-6 / DTP-7: change once when the choice differs from the one it is compared with, then close. */
    fun commit(choice: TanreiDateSelection, reason: TanreiDatePickerCloseReason) {
        val base = if (reason == TanreiDatePickerCloseReason.Confirm) session.openedWith else config.committed
        if (choice != base) change(choice)
        close(reason, null)
    }

    /** DTP-7 … DTP-9, DTP-30: choosing a day (an unavailable one is never chosen). */
    fun chooseDay(day: TanreiDate) {
        session.active = day
        if (config.unavailable(day)) return
        val next = tanreiChoose(session.pending, day, single)
        session.pending = next
        val complete = single || next.end != null
        if (config.docked && complete) commit(next, TanreiDatePickerCloseReason.Select)
    }

    /** DTP-14 / DTP-20: the previous or next month; the same day number (clamped) becomes active; announced once. */
    fun turnPage(months: Int) {
        val shown = session.shown
        val month = shown + months
        val day = if (session.active in shown) session.active.day else 1
        session.shown = month
        session.active = config.clamp(TanreiDate(month.year, month.month, minOf(day, month.length)))
        announce(config.text.monthYear(month))
    }

    /** DTP-18: the keys of a focused day. */
    fun dayKey(event: KeyEvent, rtl: Boolean): Boolean {
        if (event.type != KeyEventType.KeyDown) return false
        val next = tanreiDayKeyTarget(event.key, event.isShiftPressed, session.active, rtl, config.firstDay, config.min, config.max) ?: return false
        if (next !in session.shown) session.shown = next.calendarMonth
        session.active = next
        session.focus(dayKey(next))
        return true
    }

    /** DTP-19: the keys of a focused year. */
    fun yearKey(event: KeyEvent, rtl: Boolean): Boolean {
        if (event.type != KeyEventType.KeyDown) return false
        val next = tanreiYearKeyTarget(event.key, session.focusedYear, rtl, config.firstYear, config.lastYear) ?: return false
        session.focusedYear = next
        session.focus(yearKey(next))
        return true
    }

    /** DTP-15 / DTP-16: the view toggle switches views; the day view comes back unchanged. */
    fun toggleView() {
        if (session.view == TanreiDatePickerStartView.Day) {
            session.focusedYear = session.shown.year
            session.view = TanreiDatePickerStartView.Year
        } else {
            session.view = TanreiDatePickerStartView.Day
        }
    }

    /** DTP-16: a chosen year shows the day view of the same month in it (clamped), focuses its active day, announces it. */
    fun chooseYear(year: Int) {
        val month = config.clamp(TanreiCalendarMonth(year, session.shown.month))
        session.shown = month
        session.view = TanreiDatePickerStartView.Day
        val day = activeDayOf(month, session.pending, config)
        session.active = day
        session.focus(dayKey(day))
        announce(config.text.monthYear(month))
    }

    /** DTP-28: switch between the calendar and text entry, keeping the pending choice. */
    fun toggleEntry() {
        val toText = session.entry == TanreiDatePickerEntryMode.Calendar
        val pending = session.pending
        val month = config.clamp((pending.value ?: pending.start ?: config.today).calendarMonth)
        session.shown = month
        session.active = activeDayOf(month, pending, config)
        session.view = TanreiDatePickerStartView.Day
        if (toText) {
            session.texts[0] = fieldText(config, pending.value ?: pending.start)
            session.texts[1] = fieldText(config, pending.end)
            session.errors[0] = null
            session.errors[1] = null
        }
        session.entry = if (toText) TanreiDatePickerEntryMode.Text else TanreiDatePickerEntryMode.Calendar
        session.focus(if (toText) FIELD_KEYS[0] else dayKey(session.active))
    }

    val fieldCount: Int get() = if (single) 1 else 2

    private fun status(index: Int, text: String): FieldStatus {
        if (text.isBlank()) return FieldStatus.Empty
        val date = config.text.parseNumericDate(text) ?: return FieldStatus.Error(DatePickerFieldError.Invalid)
        val start = session.pending.start
        if (index == 1 && start != null && date < start) return FieldStatus.Error(DatePickerFieldError.Invalid)
        if (config.unavailable(date)) return FieldStatus.Error(DatePickerFieldError.Unavailable)
        return FieldStatus.Date(date)
    }

    private fun withField(choice: TanreiDateSelection, index: Int, date: TanreiDate?): TanreiDateSelection = when {
        single -> TanreiDateSelection(value = date)
        index == 0 -> choice.copy(start = date)
        else -> choice.copy(end = date)
    }

    /** DTP-26: typing never reformats; an available date becomes the field's pending date, an emptied field clears it. */
    fun fieldChanged(index: Int, text: String) {
        session.texts[index] = text
        session.errors[index] = null
        when (val status = status(index, text)) {
            FieldStatus.Empty -> session.pending = withField(session.pending, index, null)
            is FieldStatus.Date -> session.pending = withField(session.pending, index, status.date)
            is FieldStatus.Error -> Unit
        }
    }

    /** DTP-26: a committed field whose text is not an available date is in error, and its pending date is cleared. */
    fun fieldCommitted(index: Int, text: String) {
        val status = status(index, text) as? FieldStatus.Error ?: return
        session.errors[index] = status.error
        session.pending = withField(session.pending, index, null)
    }

    /** DTP-6: OK is enabled while the choice is complete and every field holds nothing or an available date. */
    val confirmEnabled: Boolean
        get() {
            val pending = session.pending
            val complete = if (single) pending.value != null else pending.start != null && pending.end != null
            val fieldsHold = session.entry != TanreiDatePickerEntryMode.Text ||
                (0 until fieldCount).all { status(it, session.texts[it]) !is FieldStatus.Error }
            return complete && fieldsHold
        }

    fun confirm() {
        if (confirmEnabled) commit(session.pending, TanreiDatePickerCloseReason.Confirm)
    }

    /** DTP-27: the action key moves to the next field, and in the last one activates OK when it is enabled. */
    fun fieldAction(index: Int) {
        if (index < fieldCount - 1) session.focus(FIELD_KEYS[index + 1]) else confirm()
    }
}

/**
 * How the picker announces the month and year it shows after paging by button or choosing a year (DTP-20): the view's
 * announcement, which TalkBack queues. Tests replace it to hear what was announced.
 */
internal object TanreiDatePickerAnnouncer {
    @Suppress("DEPRECATION")
    var announce: (View, String) -> Unit = { view, text -> view.announceForAccessibility(text) }
}

// ── The surface ──────────────────────────────────────────────────────────────

/**
 * The grid's measures across the surface (DTP-11, DTP-38): a cell's [height] (the minimum target), its [width], and the
 * container's [paddingInline].
 */
@Immutable
internal data class DatePickerGrid(val height: Dp, val width: Dp, val paddingInline: Dp) {
    /** Seven cells. */
    val gridWidth: Dp get() = width * DAYS_IN_WEEK

    /** The surface: the grid and its padding. */
    val surfaceWidth: Dp get() = gridWidth + paddingInline * 2
}

/**
 * DTP-38: what gives way on a narrow window, [widest] pixels wide (the window inside its insets, no margins;
 * [Int.MAX_VALUE] for no bound). A modal picker's margins go first (the surface, centred, reaches past them — the caller's
 * part); then the container's inline padding, so that the cells keep the minimum target; below seven targets with no
 * padding left, the cells narrow equally so that the grid fits — their height, and their numbers, stay. Narrowed
 * measures are whole pixels, so seven cells never add up to more than the window.
 */
internal fun tanreiDatePickerGrid(cell: Dp, paddingInline: Dp, widest: Int, density: Density): DatePickerGrid = with(density) {
    val full = DatePickerGrid(cell, cell, paddingInline)
    val cellPx = cell.roundToPx()
    val paddingPx = paddingInline.roundToPx()
    when {
        widest >= cellPx * DAYS_IN_WEEK + paddingPx * 2 -> full
        widest >= cellPx * DAYS_IN_WEEK -> full.copy(paddingInline = ((widest - cellPx * DAYS_IN_WEEK) / 2).toDp())
        else -> DatePickerGrid(cell, (widest.coerceAtLeast(0) / DAYS_IN_WEEK).toDp(), 0.toDp())
    }
}

/** DTP-38: the picker's [content] given the widest it may be — the incoming maximum width, or none. */
@Composable
private fun DatePickerWithinWidth(content: @Composable (widest: Int) -> Unit) {
    BoxWithConstraints { content(if (constraints.hasBoundedWidth) constraints.maxWidth else Int.MAX_VALUE) }
}

/**
 * The picker's surface and everything in it (both presentations): config and session, the keys every part shares
 * (DTP-5), the header, the calendar or the fields, and the actions of a modal picker, the scrolling of DTP-38. [maxHeight]
 * (pixels) is the room it has, [widest] (pixels) the widest it may be (DTP-38); [moveFocusIn] moves focus in on the first frame (DTP-3); [onFocusOut] hears the docked
 * popup's window lose focus.
 */
@Composable
private fun TanreiDatePickerBody(
    props: DatePickerProps,
    onClose: (TanreiDatePickerCloseReason, FocusDirection?) -> Unit,
    onChange: (TanreiDateSelection) -> Unit,
    modifier: Modifier,
    maxHeight: Int,
    widest: Int,
    moveFocusIn: Boolean,
    onFocusOut: (() -> Unit)?,
) {
    val system = TanreiTheme.tokens
    val tokens = system.datePicker
    // DTP-37: the device's date is read when the picker opens.
    val openedToday = remember { tanreiDeviceToday() }
    val locale = props.locale ?: LocalConfiguration.current.primaryDateLocale
    val text = remember(locale) { TanreiDateText(locale) }
    val config = readDatePickerConfig(props, text, openedToday)
    TanreiReportDatePickerProblems(config.reports)
    // DTP-40: still opens; reported in debuggable apps.
    if (config.labels.label.isBlank()) TanreiReportMissingName("TanreiDatePicker", "labels.label", what = "a picker without a label")
    val session = remember { DatePickerSession(config) }
    // DTP-6 / DTP-7: a modal picker keeps the choice it opened with; a docked one commits each completed choice, so it
    // follows what the product sets.
    if (config.docked) {
        LaunchedEffect(config.committed) { if (session.pending != config.committed) session.pending = config.committed }
    }
    val view = LocalView.current
    val actions = DatePickerActions(config, session, onClose, onChange) { TanreiDatePickerAnnouncer.announce(view, it) }

    // DTP-3: focus moves in when the picker opens; and wherever a part asks for it, once that part is composed.
    val request = session.focusRequest
    LaunchedEffect(request) {
        if (request == null) return@LaunchedEffect
        withFrameNanos { }
        runCatching { session.requester(request.first).requestFocus() }
    }
    if (moveFocusIn) LaunchedEffect(Unit) { session.focus(session.openingTarget) }
    if (onFocusOut != null) {
        // DTP-5: focus leaving the popup's window (to another window) closes it — once the window has had focus.
        val window = LocalWindowInfo.current
        val focusOut by rememberUpdatedState(onFocusOut)
        LaunchedEffect(window) {
            var focused = false
            snapshotFlow { window.isWindowFocused }.collect { now -> if (now) focused = true else if (focused) focusOut() }
        }
    }

    val density = LocalDensity.current
    val grid = tanreiDatePickerGrid(max(tokens.cellSize, system.measure.targetTouch), tokens.containerPaddingInline, widest, density)
    val smoothing = system.shape.cornerSmoothing
    val radius = if (config.docked) tokens.dockedContainerShape else tokens.modalContainerShape
    val shape = remember(radius, smoothing) { tanreiContainerShape(radius, smoothing) }
    val containerColor = (if (config.docked) tokens.dockedContainerColor else tokens.modalContainerColor).color
    val elevation = if (config.docked) tokens.dockedContainerElevation else tokens.modalContainerElevation
    val heightLimit = if (maxHeight == Int.MAX_VALUE) Modifier else Modifier.heightIn(max = with(density) { maxHeight.toDp() })
    val close by rememberUpdatedState(onClose)
    val docked = config.docked

    Column(
        modifier
            // DTP-38: the grid and its padding, narrowed to the window where it is narrower (tanreiDatePickerGrid); in a
            // window narrower than the surface and its margins the surface, centred, reaches past the margins.
            .requiredWidth(grid.surfaceWidth)
            .then(heightLimit)
            // DTP-36: a dialog named by label (the modal one in a window of its own).
            .semantics { if (config.labels.label.isNotBlank()) paneTitle = config.labels.label }
            // A press on the surface is the surface's: it never reaches the scrim.
            .pointerInput(Unit) { awaitPointerEventScope { while (true) awaitPointerEvent() } }
            // DTP-5: Escape; a docked picker's back and its Tab out of the picker. Heard before the parts.
            .onPreviewKeyEvent { event ->
                val down = event.type == KeyEventType.KeyDown
                when {
                    event.key == Key.Escape -> {
                        if (down) close(TanreiDatePickerCloseReason.Escape, null)
                        true
                    }
                    docked && event.key == Key.Back -> {
                        if (down) close(TanreiDatePickerCloseReason.Back, null)
                        true
                    }
                    docked && event.key == Key.Tab -> {
                        val part = session.focusedPart
                        val backwards = event.isShiftPressed
                        val leaves = if (backwards) part == VIEW_TOGGLE_KEY else part != null && (part.startsWith("day:") || part.startsWith("year:"))
                        if (leaves && down) close(TanreiDatePickerCloseReason.Tab, if (backwards) FocusDirection.Previous else FocusDirection.Next)
                        leaves
                    }
                    else -> false
                }
            }
            .tanreiElevation(elevation, shape)
            .tanreiContainer(shape, containerColor = { containerColor }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline)
            .clip(shape),
    ) {
        val middle: @Composable () -> Unit = {
            if (session.entry == TanreiDatePickerEntryMode.Text && !docked) DatePickerFields(actions) else DatePickerCalendar(actions, grid)
        }
        if (docked) {
            // DTP-38: limited to the room beside the anchor, and scrolling.
            Box(Modifier.verticalScroll(rememberScrollState())) { middle() }
        } else {
            DatePickerModalColumn(actions, grid, middle)
        }
    }
}

/**
 * DTP-23, DTP-24, DTP-38: the header and its divider, the calendar or the fields, and the actions. The header and the
 * actions stay while the middle scrolls between them; when they alone leave the middle less than a cell, everything
 * scrolls together.
 */
@Composable
private fun DatePickerModalColumn(actions: DatePickerActions, grid: DatePickerGrid, middle: @Composable () -> Unit) {
    val cellPx = with(LocalDensity.current) { grid.height.roundToPx() }
    var scrollAll by remember { mutableStateOf(false) }
    val all = rememberScrollState()
    val part = rememberScrollState()
    Column(if (scrollAll) Modifier.verticalScroll(all) else Modifier) {
        DatePickerHeader(actions)
        DatePickerDivider()
        val body = if (scrollAll) {
            Modifier
        } else {
            Modifier
                .weight(1f, fill = false)
                .onSizeChanged { size -> if (size.height < cellPx && part.maxValue > 0) scrollAll = true }
                .verticalScroll(part)
        }
        Box(body) { middle() }
        DatePickerActionsRow(actions, grid)
    }
}

// ── The header (DTP-23) ──────────────────────────────────────────────────────

@Composable
private fun DatePickerHeader(actions: DatePickerActions) {
    val system = TanreiTheme.tokens
    val tokens = system.datePicker
    val config = actions.config
    val session = actions.session
    val labels = config.labels
    val valueColor = tokens.headerValueColor.color
    val placeholderColor = tokens.headerPlaceholderColor.color
    val pending = session.pending
    val currentYear = config.today.year
    val headline: AnnotatedString = buildAnnotatedString {
        fun part(text: String, chosen: Boolean) = withStyle(SpanStyle(color = if (chosen) valueColor else placeholderColor)) { append(text) }
        if (config.single) {
            val date = pending.value
            part(date?.let { config.text.headerDate(it, currentYear) } ?: labels.dateLabel, date != null)
        } else {
            val start = pending.start
            val end = pending.end
            part(start?.let { config.text.headerRangeDate(it, currentYear) } ?: labels.startLabel, start != null)
            // The dash takes the value's color once both ends are chosen.
            part(RANGE_DASH, start != null && end != null)
            part(end?.let { config.text.headerRangeDate(it, currentYear) } ?: labels.endLabel, end != null)
        }
    }
    val toText = session.entry == TanreiDatePickerEntryMode.Calendar
    Column(
        Modifier
            .fillMaxWidth()
            .padding(start = tokens.headerPaddingInlineStart, end = tokens.headerPaddingInlineEnd, top = tokens.headerPaddingBlock, bottom = tokens.headerPaddingBlock),
        verticalArrangement = Arrangement.spacedBy(tokens.headerGap),
    ) {
        BasicText(labels.label, style = tokens.headerLabelTypescale.toTextStyle().merge(TextStyle(color = tokens.headerLabelColor.color)))
        Row(verticalAlignment = Alignment.CenterVertically) {
            // Grows with enlarged text; wraps rather than being cut.
            BasicText(headline, modifier = Modifier.weight(1f), style = tokens.headerValueTypescale.toTextStyle().merge(TextStyle(color = valueColor)))
            DatePickerIconButton(
                key = ENTRY_TOGGLE_KEY,
                session = session,
                glyph = if (toText) KEYBOARD_GLYPH else CALENDAR_GLYPH,
                contentDescription = if (toText) labels.textEntryLabel else labels.calendarEntryLabel,
                enabled = true,
                onClick = actions::toggleEntry,
            )
        }
    }
}

/** DTP-23: the hairline below the header, across the container; no semantics. */
@Composable
private fun DatePickerDivider() {
    val tokens = TanreiTheme.tokens.datePicker
    Box(Modifier.fillMaxWidth().height(tokens.dividerWidth).background(tokens.dividerColor.color).clearAndSetSemantics {})
}

/**
 * DTP-24: Cancel and OK, text Buttons of the medium size, OK last, in one row at the end, `actions.gap` apart,
 * `container.padding-inline` from the end edge, `actions.padding-block` above and below. They keep their own tokens.
 */
@Composable
private fun DatePickerActionsRow(actions: DatePickerActions, grid: DatePickerGrid) {
    val tokens = TanreiTheme.tokens.datePicker
    val session = actions.session
    Row(
        // DTP-38: the container's inline padding, as narrowed.
        Modifier.fillMaxWidth().padding(end = grid.paddingInline, top = tokens.actionsPaddingBlock, bottom = tokens.actionsPaddingBlock),
        horizontalArrangement = Arrangement.spacedBy(tokens.actionsGap, Alignment.End),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TanreiButton(
            text = actions.config.labels.cancelLabel,
            onClick = { actions.close(TanreiDatePickerCloseReason.Cancel, null) },
            modifier = Modifier.datePickerPart(session, CANCEL_KEY),
            variant = TanreiButtonVariant.Text,
            size = TanreiButtonSize.Medium,
        )
        TanreiButton(
            text = actions.config.labels.confirmLabel,
            onClick = actions::confirm,
            modifier = Modifier.datePickerPart(session, CONFIRM_KEY),
            variant = TanreiButtonVariant.Text,
            size = TanreiButtonSize.Medium,
            enabled = actions.confirmEnabled,
        )
    }
}

private const val CANCEL_KEY = "cancel"
private const val CONFIRM_KEY = "confirm"

/** A placed part's focus: its requester (the session can move focus to it) and whether focus is in it. */
private fun Modifier.datePickerPart(session: DatePickerSession, key: String): Modifier =
    focusRequester(session.requester(key)).onFocusChanged { state ->
        if (state.hasFocus) session.focusedPart = key else if (session.focusedPart == key) session.focusedPart = null
    }

/** A standard medium Tanrei icon button showing the glyph [glyph] (the navigation and entry-mode buttons, DTP-14, DTP-23). */
@Composable
private fun DatePickerIconButton(key: String, session: DatePickerSession, glyph: String, contentDescription: String, enabled: Boolean, onClick: () -> Unit) {
    val iconSize = TanreiTheme.tokens.iconButton.sizes[TanreiIconButtonSize.Medium].iconSize
    TanreiIconButton(
        onClick = onClick,
        contentDescription = contentDescription,
        modifier = Modifier.datePickerPart(session, key),
        variant = TanreiIconButtonVariant.Standard,
        size = TanreiIconButtonSize.Medium,
        enabled = enabled,
    ) {
        TanreiNamedGlyph(glyph, LocalTanreiIconGlyph.current, iconSize, LocalTanreiContentColor.current)
    }
}

// ── Text entry (DTP-25 … DTP-27) ─────────────────────────────────────────────

/**
 * DTP-25: outlined medium text fields — one the full width in single mode, two side by side `input.gap` apart in range
 * mode — inset by `input.padding-*`; the placeholder the locale's numeric pattern ("mm/dd/yyyy"); errors on commit.
 *
 * In range mode each field makes room for the other's label ([LocalTanreiTextFieldLabelRoom], as the time picker's
 * fields do): when one label wraps and the other does not (TXF-13) both are the taller one's height, and the row aligns
 * them by their containers' top ([TanreiTextFieldContainerTop]), so the containers are level.
 */
@Composable
private fun DatePickerFields(actions: DatePickerActions) {
    val tokens = TanreiTheme.tokens.datePicker
    val config = actions.config
    val session = actions.session
    val labels = config.labels
    val pattern = remember(config.text) { config.text.numericPattern() }
    val room = if (config.single) emptyList() else listOf(labels.startLabel, labels.endLabel)
    Row(
        Modifier.fillMaxWidth().padding(horizontal = tokens.inputPaddingInline, vertical = tokens.inputPaddingBlock),
        horizontalArrangement = Arrangement.spacedBy(tokens.inputGap),
    ) {
        CompositionLocalProvider(LocalTanreiTextFieldLabelRoom provides room) {
            for (index in 0 until actions.fieldCount) {
                val error = session.errors[index]
                val field = remember(index) {
                    KeyboardActions(
                        onDone = { actions.fieldAction(index) },
                        onNext = { actions.fieldAction(index) },
                        onGo = { actions.fieldAction(index) },
                        onSend = { actions.fieldAction(index) },
                        onSearch = { actions.fieldAction(index) },
                    )
                }
                TanreiTextField(
                    value = session.texts[index],
                    onValueChange = { actions.fieldChanged(index, it) },
                    label = when {
                        config.single -> labels.dateLabel
                        index == 0 -> labels.startLabel
                        else -> labels.endLabel
                    },
                    modifier = Modifier.weight(1f).alignBy(TanreiTextFieldContainerTop).datePickerPart(session, FIELD_KEYS[index]),
                    variant = TanreiTextFieldVariant.Outlined,
                    size = TanreiTextFieldSize.Medium,
                    type = TanreiTextFieldType.Text,
                    placeholder = pattern,
                    errorText = when (error) {
                        DatePickerFieldError.Invalid -> labels.invalidText
                        DatePickerFieldError.Unavailable -> labels.unavailableText
                        null -> ""
                    },
                    isError = error != null,
                    onCommit = { actions.fieldCommitted(index, it) },
                    keyboardActions = field,
                )
            }
        }
    }
}

// ── The calendar (DTP-11 … DTP-21) ───────────────────────────────────────────

/**
 * DTP-11 / DTP-14: the navigation row (at least a cell tall: the view toggle at the start, previous and next at the end),
 * then the day view or the year list in the same space, cross-faded over the page motion (DTP-21). Inset by
 * `container.padding-inline` at the sides and `container.padding-block` above and below.
 */
@Composable
private fun DatePickerCalendar(actions: DatePickerActions, grid: DatePickerGrid) {
    val tokens = TanreiTheme.tokens.datePicker
    val config = actions.config
    val session = actions.session
    val labels = config.labels
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val yearView = session.view == TanreiDatePickerStartView.Year
    Column(Modifier.padding(horizontal = grid.paddingInline, vertical = tokens.containerPaddingBlock)) {
        Row(Modifier.width(grid.gridWidth).heightIn(min = tokens.cellSize), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) {
                DatePickerViewToggle(actions)
            }
            if (!yearView) {
                val minMonth = config.min?.calendarMonth
                val maxMonth = config.max?.calendarMonth
                Row(horizontalArrangement = Arrangement.spacedBy(tokens.navigationGap)) {
                    // chevron_left and chevron_right point toward the start and the end: swapped right to left.
                    DatePickerIconButton(
                        key = PREVIOUS_KEY,
                        session = session,
                        glyph = if (rtl) CHEVRON_RIGHT_GLYPH else CHEVRON_LEFT_GLYPH,
                        contentDescription = labels.previousMonthLabel,
                        enabled = minMonth == null || session.shown > minMonth,
                        onClick = { actions.turnPage(-1) },
                    )
                    DatePickerIconButton(
                        key = NEXT_KEY,
                        session = session,
                        glyph = if (rtl) CHEVRON_LEFT_GLYPH else CHEVRON_RIGHT_GLYPH,
                        contentDescription = labels.nextMonthLabel,
                        enabled = maxMonth == null || session.shown < maxMonth,
                        onClick = { actions.turnPage(1) },
                    )
                }
            }
        }
        // DTP-21: the day view and the year list cross-fade over the page motion (at once where motion is reduced).
        AnimatedContent(
            targetState = session.view,
            transitionSpec = {
                fadeIn(tanreiTween(tokens.motionPageDuration, tokens.motionPageEasing)) togetherWith fadeOut(tanreiTween(tokens.motionPageDuration, tokens.motionPageEasing))
            },
            label = "view",
        ) { view ->
            val interactive = transition.targetState == EnterExitState.Visible
            if (view == TanreiDatePickerStartView.Day) DatePickerDayView(actions, grid, interactive) else DatePickerYearList(actions, grid, interactive)
        }
    }
}

/**
 * DTP-11 / DTP-13 / DTP-36: the weekday row and six rows of days, one grid to assistive technology — named by the month
 * and year it shows, its collection 7 columns wide with the weekday row as row 0. A month change slides the grid (not
 * the weekday row) over the page motion: a later month in from the end, an earlier one from the start (DTP-21).
 */
@Composable
private fun DatePickerDayView(actions: DatePickerActions, grid: DatePickerGrid, interactive: Boolean) {
    val tokens = TanreiTheme.tokens.datePicker
    val config = actions.config
    val session = actions.session
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val weekdayStyle = tokens.weekdayTypescale.toTextStyle().merge(TextStyle(color = tokens.weekdayColor.color, textAlign = TextAlign.Center))
    Column(
        Modifier
            .width(grid.gridWidth)
            .semantics {
                contentDescription = config.text.monthYear(session.shown)
                collectionInfo = CollectionInfo(rowCount = GRID_ROWS + 1, columnCount = DAYS_IN_WEEK)
                isTraversalGroup = true
            }
            // DTP-18: the keys of the focused day.
            .onKeyEvent { event -> session.focusedPart?.startsWith("day:") == true && actions.dayKey(event, rtl) },
    ) {
        Row {
            for (column in 0 until DAYS_IN_WEEK) {
                val weekday = (config.firstDay + column) % DAYS_IN_WEEK
                // DTP-13: the narrow name, named by the full one; no focus.
                Box(
                    Modifier
                        .width(grid.width)
                        .heightIn(min = grid.height)
                        .clearAndSetSemantics {
                            contentDescription = config.text.longWeekdays[weekday]
                            collectionItemInfo = CollectionItemInfo(rowIndex = 0, rowSpan = 1, columnIndex = column, columnSpan = 1)
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    BasicText(config.text.narrowWeekdays[weekday], style = weekdayStyle)
                }
            }
        }
        AnimatedContent(
            targetState = session.shown,
            // The months slide inside the grid's own width, never over the surface's padding.
            modifier = Modifier.clipToBounds(),
            transitionSpec = {
                val later = targetState > initialState
                // Toward the start for a later month: the left, left to right.
                val sign = (if (later) 1 else -1) * (if (rtl) -1 else 1)
                val spec = tanreiTween<IntOffset>(tokens.motionPageDuration, tokens.motionPageEasing)
                slideInHorizontally(spec) { width -> sign * width } togetherWith slideOutHorizontally(spec) { width -> -sign * width }
            },
            label = "month",
        ) { month ->
            val entering = transition.targetState == EnterExitState.Visible
            DatePickerDayGrid(actions, month, grid, interactive && entering)
        }
    }
}

/** DTP-11: six rows of seven cells; the first day of the month in the column of its weekday; empty cells hidden. */
@Composable
private fun DatePickerDayGrid(actions: DatePickerActions, month: TanreiCalendarMonth, grid: DatePickerGrid, interactive: Boolean) {
    val config = actions.config
    val session = actions.session
    val pending = session.pending
    val lead = Math.floorMod(month.first.weekday - config.firstDay, DAYS_IN_WEEK)
    val start = pending.start
    val end = pending.end
    val ranged = start != null && end != null && start != end
    Column {
        for (row in 0 until GRID_ROWS) {
            Row {
                for (column in 0 until DAYS_IN_WEEK) {
                    val number = row * DAYS_IN_WEEK + column - lead + 1
                    if (number < 1 || number > month.length) {
                        Box(Modifier.width(grid.width).heightIn(min = grid.height).clearAndSetSemantics {})
                        continue
                    }
                    val date = TanreiDate(month.year, month.month, number)
                    val isStart = date == start
                    val isEnd = date == end
                    val inSpan = start != null && end != null && date >= start && date <= end
                    val today = date == config.today
                    TanreiDatePickerDay(
                        date = date,
                        disabled = config.unavailable(date),
                        actions = actions,
                        condition = tanreiDayCondition(date, pending, config.today),
                        band = when {
                            ranged && isStart -> DayBand.TowardEnd
                            ranged && isEnd -> DayBand.TowardStart
                            else -> null
                        },
                        selected = date == pending.value || inSpan || isStart,
                        name = config.text.fullDate(date) + if (today) ", ${config.labels.todayLabel}" else "",
                        description = when {
                            isStart && !config.single -> config.labels.startLabel
                            isEnd && !config.single -> config.labels.endLabel
                            else -> null
                        },
                        position = CollectionItemInfo(rowIndex = row + 1, rowSpan = 1, columnIndex = column, columnSpan = 1),
                        grid = grid,
                        interactive = interactive,
                    )
                }
            }
        }
    }
}

/** Which half of a range's start or end cell the band runs into (DTP-12). */
private enum class DayBand { TowardStart, TowardEnd }

/**
 * One day (the spec's item kind `day`), which the picker generates: [date], and [disabled] while it is
 * unavailable. Its cell is its hit area — never smaller than the target, and extended over none of its neighbours
 * (DTP-11). DTP-12: its number centred on a square of `day.container.size` with `day.container.shape` corners in the
 * container and outline colors of its [condition]; an in-range day's container spans the cell instead (the band, square
 * ends), and a range's start and end draw the half of their cell toward the other in the band's color. DTP-30: an
 * unavailable day draws from the disabled tokens, is announced disabled, stays reachable by the arrow keys and is never
 * chosen. DTP-31 … DTP-35: the day's state answer, press hold, pressed feedback, focus ring (around the square, never
 * animated) and corners. DTP-36: a button named by its full date (and today's label), selected, described by the start
 * or end label, with its place in the grid.
 */
@Composable
private fun TanreiDatePickerDay(
    date: TanreiDate,
    disabled: Boolean,
    actions: DatePickerActions,
    condition: TanreiDatePickerCondition,
    band: DayBand?,
    selected: Boolean,
    name: String,
    description: String?,
    position: CollectionItemInfo,
    grid: DatePickerGrid,
    interactive: Boolean,
) {
    val system = TanreiTheme.tokens
    val tokens = system.datePicker
    val session = actions.session
    val source = remember { MutableInteractionSource() }
    val interaction = source.collectTanreiInteraction(enabled = !disabled)
    val look = rememberDatePickerItemLook(condition, interaction)
    val key = dayKey(date)
    val active = interactive && date == session.active
    val inRange = condition == InRange
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.dayContainerShape, smoothing) { tanreiContainerShape(tokens.dayContainerShape, smoothing) }
    val bandColor = tokens.conditions.inRange.enabled.containerColor.color
    val outline = look.outline.value
    // DTP-30: an unavailable day keeps a focus target (the arrow keys reach it) and hears the pointer.
    val reachable = if (disabled) Modifier.focusable(interactionSource = source).hoverable(source) else Modifier
    val input = Modifier
        .semantics {
            contentDescription = name
            if (description != null) stateDescription = description
            this.selected = selected
            collectionItemInfo = position
        }
        // DTP-17: the grid is one Tab stop, the active day.
        .then(if (interactive) Modifier.focusRequester(session.requester(key)) else Modifier)
        .focusProperties { canFocus = active }
        .onFocusChanged { state -> if (state.isFocused) session.focusedPart = key else if (session.focusedPart == key) session.focusedPart = null }
        .then(reachable)
        .clickable(interactionSource = source, indication = null, enabled = !disabled && interactive, role = Role.Button) { actions.chooseDay(date) }
        .tanreiPressInput(interaction.press, !disabled && interactive)
        .tanreiRippleInput(look.ripple)
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, NoShadow)) { look.opacity.value }
        .width(grid.width)
        .heightIn(min = grid.height)
    Box(input, contentAlignment = Alignment.Center) {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            if (band != null && bandColor.isDrawn) {
                Box(Modifier.matchParentSize()) {
                    Box(
                        Modifier
                            .fillMaxWidth(HALF)
                            .fillMaxHeight()
                            .align(if (band == DayBand.TowardEnd) Alignment.CenterEnd else Alignment.CenterStart)
                            .background(bandColor),
                    )
                }
            }
            if (inRange) {
                // The band: the cell's whole width, square ends; its segment of the state answer and the ripple.
                Box(Modifier.matchParentSize().tanreiContainer(RectangleShape, containerColor = { look.container.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = look.ripple))
            }
            Box(
                Modifier
                    // DTP-32: around the day's square, an in-range day's too; never animated.
                    .tanreiFocusRing(source, cornerRadius = tokens.dayContainerShape)
                    // The band (above) carries an in-range day's fill and ripple; the square keeps its outline.
                    .tanreiContainer(shape, containerColor = { if (inRange) Color.Transparent else look.container.value }, outlineColor = outline, outlineWidth = tokens.outlineWidth, ripple = if (inRange) null else look.ripple)
                    // DTP-38: grows to hold its number.
                    .defaultMinSize(tokens.dayContainerSize, tokens.dayContainerSize),
                contentAlignment = Alignment.Center,
            ) {
                BasicText(
                    actions.config.text.number(date.day),
                    modifier = Modifier.clearAndSetSemantics {},
                    style = tokens.dayLabelTypescale.toTextStyle().merge(TextStyle(textAlign = TextAlign.Center)),
                    color = { look.label.value },
                )
            }
        }
    }
}

/** What a day, a year or the view toggle draws in its condition and state (DTP-31, DTP-33, DTP-34). */
private class DatePickerItemLook(
    val container: State<Color>,
    val label: State<Color>,
    val outline: State<Color>,
    val opacity: State<Float>,
    val ripple: TanreiRipple?,
)

/**
 * DTP-31, DTP-33, DTP-34: the item's parts from `conditions[condition][state]` — the state that wins (pressed over
 * keyboard-focused over hovered; disabled for an unavailable day), held pressed for press-hold, the container color with
 * the state under the press where the system's pressed feedback says so, the ripple of the condition's pressed container
 * color — animated over the state duration and easing (entering pressed snaps; at once where motion is reduced).
 */
@Composable
private fun rememberDatePickerItemLook(condition: TanreiDatePickerCondition, interaction: TanreiInteraction): DatePickerItemLook {
    val system = TanreiTheme.tokens
    val tokens = system.datePicker
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val palette = tokens.conditions[condition]
    val drawn = palette[drawnStates.content]
    val motion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    return DatePickerItemLook(
        container = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "container"),
        label = animateTanreiColorAsState(drawn.labelColor.color, motion, label = "label"),
        outline = animateTanreiColorAsState(drawn.outlineColor.color, motion, label = "outline"),
        opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity"),
        ripple = rememberTanreiRipple(
            feedback = feedback,
            interaction = interaction,
            color = palette.pressed.containerColor.color,
            feedbackDurationMillis = tokens.motionFeedbackDuration,
            stateDurationMillis = tokens.motionStateDuration,
            stateEasing = tokens.motionStateEasing,
        ),
    )
}

/**
 * DTP-15 / DTP-36: the view toggle — the displayed month and year and the expand_more glyph, `view-toggle.gap` apart,
 * on a container at least `view-toggle.container.height` tall with its own corners and inline padding, drawn from the
 * unselected condition in its state; the glyph turns half a turn while the year view is shown. Its hit area extends to
 * the touch target. A button named by the month and year, described by `yearViewLabel`, expanded (Compose's expand /
 * collapse actions) while the year view is shown.
 */
@Composable
private fun DatePickerViewToggle(actions: DatePickerActions) {
    val system = TanreiTheme.tokens
    val tokens = system.datePicker
    val config = actions.config
    val session = actions.session
    val source = remember { MutableInteractionSource() }
    val interaction = source.collectTanreiInteraction(enabled = true)
    val look = rememberDatePickerItemLook(Unselected, interaction)
    val expanded = session.view == TanreiDatePickerStartView.Year
    val turn by animateFloatAsState(if (expanded) HALF_TURN else 0f, tanreiTween(tokens.motionStateDuration, tokens.motionStateEasing), label = "turn")
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.viewToggleContainerShape, smoothing) { tanreiContainerShape(tokens.viewToggleContainerShape, smoothing) }
    val glyph = system.icon.glyph(tokens.viewToggleIconSize, selected = false)
    val text = config.text.monthYear(session.shown)
    val outline = look.outline.value
    Row(
        Modifier
            .datePickerPart(session, VIEW_TOGGLE_KEY)
            .semantics {
                stateDescription = config.labels.yearViewLabel
                if (expanded) collapse { actions.toggleView(); true } else expand { actions.toggleView(); true }
            }
            .clickable(interactionSource = source, indication = null, role = Role.Button, onClick = actions::toggleView)
            .tanreiPressInput(interaction.press)
            .tanreiRippleInput(look.ripple)
            .tanreiMinimumTouchTarget()
            .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, NoShadow)) { look.opacity.value }
            .tanreiFocusRing(source, cornerRadius = tokens.viewToggleContainerShape)
            .tanreiContainer(shape, containerColor = { look.container.value }, outlineColor = outline, outlineWidth = tokens.outlineWidth, ripple = look.ripple)
            .heightIn(min = tokens.viewToggleContainerHeight)
            .padding(horizontal = tokens.viewToggleContainerPaddingInline),
        horizontalArrangement = Arrangement.spacedBy(tokens.viewToggleGap),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BasicText(text, style = tokens.viewToggleLabelTypescale.toTextStyle(), color = { look.label.value })
        Box(Modifier.size(tokens.viewToggleIconSize).graphicsLayer { rotationZ = turn }) {
            TanreiNamedGlyph(EXPAND_GLYPH, glyph, tokens.viewToggleIconSize, look.label.value)
        }
    }
}

/**
 * DTP-16 / DTP-19: the years from min's to max's (1900 and 2100 for an empty side) in rows of three cells, each a third of
 * the grid's width and a cell tall, in the space of the weekday row and the six rows of days; it scrolls, and opens with
 * the displayed year's row third in view (as near as the list's ends allow). One Tab stop, the focused year; the keys
 * of DTP-19; a focused year is scrolled into view.
 */
@Composable
private fun DatePickerYearList(actions: DatePickerActions, grid: DatePickerGrid, interactive: Boolean) {
    val config = actions.config
    val session = actions.session
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val first = config.firstYear
    val last = config.lastYear
    val shownRow = (session.shown.year - first) / YEARS_PER_ROW
    val density = LocalDensity.current
    val cellPx = with(density) { grid.height.roundToPx() }
    // DTP-38: a third of the grid; in whole pixels where the cells are narrowed, so that three never pass its edge.
    val yearWidth = if (grid.width < grid.height) with(density) { (grid.gridWidth.roundToPx() / YEARS_PER_ROW).toDp() } else grid.gridWidth / YEARS_PER_ROW
    val scroll = rememberScrollState(initial = ((shownRow - 2) * cellPx).coerceAtLeast(0))
    val tabStop = session.focusedYear.coerceIn(first, last)
    Column(
        Modifier
            .width(grid.gridWidth)
            .height(grid.height * (GRID_ROWS + 1))
            .onKeyEvent { event -> session.focusedPart?.startsWith("year:") == true && actions.yearKey(event, rtl) }
            .verticalScroll(scroll),
    ) {
        for (rowStart in first..last step YEARS_PER_ROW) {
            Row {
                for (year in rowStart..minOf(rowStart + YEARS_PER_ROW - 1, last)) {
                    TanreiDatePickerYear(
                        year = year,
                        actions = actions,
                        condition = tanreiYearCondition(year, session.shown.year, config.today),
                        tabStop = interactive && year == tabStop,
                        interactive = interactive,
                        width = yearWidth,
                        height = grid.height,
                    )
                }
            }
        }
    }
}

/**
 * One year of the year view (the spec's item kind `year`), which the picker generates: [year] on a container
 * of `year.container.width` by `year.container.height` with `year.container.shape` corners, colored and outlined as a
 * day of its [condition] is, centred in its cell. A button with its selected state and today's label for the current
 * year (DTP-36).
 */
@Composable
private fun TanreiDatePickerYear(
    year: Int,
    actions: DatePickerActions,
    condition: TanreiDatePickerCondition,
    tabStop: Boolean,
    interactive: Boolean,
    width: Dp,
    height: Dp,
) {
    val system = TanreiTheme.tokens
    val tokens = system.datePicker
    val config = actions.config
    val session = actions.session
    val source = remember { MutableInteractionSource() }
    val interaction = source.collectTanreiInteraction(enabled = true)
    val look = rememberDatePickerItemLook(condition, interaction)
    val key = yearKey(year)
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.yearContainerShape, smoothing) { tanreiContainerShape(tokens.yearContainerShape, smoothing) }
    val text = config.text.number(year)
    val outline = look.outline.value
    Box(
        Modifier
            .semantics {
                contentDescription = if (year == config.today.year) "$text, ${config.labels.todayLabel}" else text
                selected = condition == Selected
            }
            .then(if (interactive) Modifier.focusRequester(session.requester(key)) else Modifier)
            .focusProperties { canFocus = tabStop || session.focusRequest?.first == key }
            .onFocusChanged { state ->
                if (state.isFocused) {
                    session.focusedPart = key
                    session.focusedYear = year
                } else if (session.focusedPart == key) {
                    session.focusedPart = null
                }
            }
            .clickable(interactionSource = source, indication = null, enabled = interactive, role = Role.Button) { actions.chooseYear(year) }
            .tanreiPressInput(interaction.press, interactive)
            .tanreiRippleInput(look.ripple)
            .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, NoShadow)) { look.opacity.value }
            .width(width)
            .heightIn(min = height),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier
                .tanreiFocusRing(source, cornerRadius = tokens.yearContainerShape)
                .tanreiContainer(shape, containerColor = { look.container.value }, outlineColor = outline, outlineWidth = tokens.outlineWidth, ripple = look.ripple)
                .defaultMinSize(tokens.yearContainerWidth, tokens.yearContainerHeight),
            contentAlignment = Alignment.Center,
        ) {
            BasicText(text, modifier = Modifier.clearAndSetSemantics {}, style = tokens.yearLabelTypescale.toTextStyle().merge(TextStyle(textAlign = TextAlign.Center)), color = { look.label.value })
        }
    }
}

// ── Locale data (DTP-37) ─────────────────────────────────────────────────────

/**
 * The locale's words, digits and date forms for the picker, always of the Gregorian calendar and in UTC (a calendar
 * date has no time zone): the month and year ("September 2026"), a day's full date, the header's forms, the narrow and
 * full weekday names, numbers in the locale's digits, the first day of the week, and the numeric date — its fields'
 * order and separators, the placeholder pattern ("mm/dd/yyyy"), a date written in it ("09/17/2026") and a typed one read
 * back (DTP-26). `android.icu` on API 24 and above; `java.text` and the platform's best patterns below.
 */
@Stable
internal class TanreiDateText(val locale: Locale) {
    private val data: DateData = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) IcuDateData(locale) else JavaDateData(locale)
    private val formats = HashMap<String, (TanreiDate) -> String>()

    private fun format(skeleton: String, date: TanreiDate): String = formats.getOrPut(skeleton) { data.formatter(skeleton) }(date)

    /** "September 2026". */
    fun monthYear(month: TanreiCalendarMonth): String = format("yMMMM", month.first)

    /** "Thursday, September 17, 2026": a day's accessible name. */
    fun fullDate(date: TanreiDate): String = format("yMMMMEEEEd", date)

    /** "Thu, Sep 17" — with the year when it is not [currentYear] (DTP-23). */
    fun headerDate(date: TanreiDate, currentYear: Int): String = format(if (date.year == currentYear) "MMMEd" else "yMMMEd", date)

    /** "Sep 17" — with the year when it is not [currentYear] (DTP-23). */
    fun headerRangeDate(date: TanreiDate, currentYear: Int): String = format(if (date.year == currentYear) "MMMd" else "yMMMd", date)

    /** The narrow weekday names, Sunday first ("S", "M" …; "日", "月" …). */
    val narrowWeekdays: List<String> by lazy { data.weekdays(narrow = true) }

    /** The full weekday names, Sunday first. */
    val longWeekdays: List<String> by lazy { data.weekdays(narrow = false) }

    /** The locale's first day of the week, 0 (Sunday) to 6. */
    val firstDayOfWeek: Int get() = data.firstDayOfWeek

    /** [value] in the locale's digits, at least [digits] of them, without grouping. */
    fun number(value: Int, digits: Int = 1): String = data.number(value, digits)

    /** The numeric date's parts in the locale's order: `y`, `M`, `d` and the literal text between them. */
    private val parts: List<String> by lazy { numericParts(data.numericPattern()) }

    /** DTP-25: the placeholder — yyyy, mm and dd in the locale's order and with its separator ("mm/dd/yyyy"). */
    fun numericPattern(): String = parts.joinToString("") { part ->
        when (part) {
            "y" -> "yyyy"
            "M" -> "mm"
            "d" -> "dd"
            else -> part
        }
    }

    /** DTP-26: [date] in the locale's numeric form with a two-digit day and month and a four-digit year ("09/17/2026"). */
    fun numericDate(date: TanreiDate): String = parts.joinToString("") { part ->
        when (part) {
            "y" -> number(date.year, 4)
            "M" -> number(date.month, 2)
            "d" -> number(date.day, 2)
            else -> part
        }
    }

    /**
     * DTP-26: [text] read as a date — exactly three groups of digits (ASCII or the locale's), separated by one or more
     * other characters, in the order of the locale's numeric form, with a four-digit year and a month and day that exist
     * in that year; leading zeros optional. Null otherwise.
     */
    fun parseNumericDate(text: String): TanreiDate? {
        val groups = mutableListOf<StringBuilder>()
        var inGroup = false
        for (char in text) {
            val digit = Character.digit(char, 10)
            if (digit >= 0) {
                if (!inGroup) groups += StringBuilder()
                groups.last().append(digit)
                inGroup = true
            } else {
                inGroup = false
            }
        }
        if (groups.size != 3) return null
        val order = parts.filter { it == "y" || it == "M" || it == "d" }
        val values = order.zip(groups.map { it.toString() }).toMap()
        val year = values["y"] ?: return null
        val month = values["M"] ?: return null
        val day = values["d"] ?: return null
        if (year.length != 4 || month.length > 2 || day.length > 2) return null
        return TanreiDate.of(year.toInt(), month.toInt(), day.toInt())
    }

    private companion object {
        /** A pattern's fields (`y`, `M`, `d`, once each) and literals; anything else is the English order. */
        fun numericParts(pattern: String): List<String> {
            val parts = mutableListOf<String>()
            val literal = StringBuilder()
            var index = 0
            fun flush() {
                if (literal.isNotEmpty()) parts += literal.toString()
                literal.clear()
            }
            while (index < pattern.length) {
                val char = pattern[index]
                when {
                    char == '\'' -> {
                        val close = pattern.indexOf('\'', index + 1).takeIf { it > index } ?: pattern.length
                        literal.append(if (close == index + 1) "'" else pattern.substring(index + 1, close))
                        index = close + 1
                        continue
                    }
                    char == 'y' || char == 'M' || char == 'd' -> {
                        flush()
                        parts += char.toString()
                        while (index < pattern.length && pattern[index] == char) index++
                        continue
                    }
                    char.isLetter() -> Unit // Another field (an era): not part of a numeric date.
                    else -> literal.append(char)
                }
                index++
            }
            flush()
            val fields = parts.filter { it == "y" || it == "M" || it == "d" }
            return if (fields.size == 3 && fields.toSet().size == 3) parts else listOf("M", "/", "d", "/", "y")
        }
    }
}

/** The platform's locale data. */
private interface DateData {
    fun formatter(skeleton: String): (TanreiDate) -> String
    fun weekdays(narrow: Boolean): List<String>
    val firstDayOfWeek: Int
    fun number(value: Int, digits: Int): String
    fun numericPattern(): String
}

/** Midnight UTC of [date], in milliseconds: the instant a UTC formatter writes as that date. */
private fun TanreiDate.utcMillis(): Long = epochDay * MILLIS_PER_DAY

@RequiresApi(Build.VERSION_CODES.N)
private class IcuDateData(locale: Locale) : DateData {
    private val uLocale = android.icu.util.ULocale.forLocale(locale)

    private fun calendar() = android.icu.util.GregorianCalendar(android.icu.util.TimeZone.getTimeZone("UTC"), uLocale)

    override fun formatter(skeleton: String): (TanreiDate) -> String {
        val format = android.icu.text.DateFormat.getInstanceForSkeleton(calendar(), skeleton, uLocale)
        return { date -> format.format(java.util.Date(date.utcMillis())) }
    }

    override fun weekdays(narrow: Boolean): List<String> {
        val symbols = android.icu.text.DateFormatSymbols(calendar(), uLocale)
        val names = symbols.getWeekdays(android.icu.text.DateFormatSymbols.STANDALONE, if (narrow) android.icu.text.DateFormatSymbols.NARROW else android.icu.text.DateFormatSymbols.WIDE)
        return (1..DAYS_IN_WEEK).map { names[it] }
    }

    override val firstDayOfWeek: Int = android.icu.util.Calendar.getInstance(uLocale).firstDayOfWeek - 1

    private val numbers = HashMap<Int, android.icu.text.NumberFormat>()

    override fun number(value: Int, digits: Int): String = numbers.getOrPut(digits) {
        android.icu.text.NumberFormat.getIntegerInstance(uLocale).apply {
            isGroupingUsed = false
            minimumIntegerDigits = digits
        }
    }.format(value.toLong())

    override fun numericPattern(): String =
        (android.icu.text.DateFormat.getInstanceForSkeleton(calendar(), "yyyyMMdd", uLocale) as? android.icu.text.SimpleDateFormat)?.toPattern() ?: ""
}

/** API 23: `java.text` with the platform's best pattern for each skeleton (below API 24 there is no `android.icu`). */
private class JavaDateData(private val locale: Locale) : DateData {
    private fun format(pattern: String) = java.text.SimpleDateFormat(pattern, locale).apply {
        calendar = java.util.GregorianCalendar(java.util.TimeZone.getTimeZone("UTC"), locale)
    }

    override fun formatter(skeleton: String): (TanreiDate) -> String {
        val format = format(android.text.format.DateFormat.getBestDateTimePattern(locale, skeleton))
        return { date -> format.format(java.util.Date(date.utcMillis())) }
    }

    override fun weekdays(narrow: Boolean): List<String> {
        val format = format(if (narrow) "EEEEE" else "EEEE")
        // 1970-01-04 was a Sunday.
        return (0 until DAYS_IN_WEEK).map { format.format(java.util.Date((FIRST_SUNDAY_EPOCH_DAY + it) * MILLIS_PER_DAY)) }
    }

    override val firstDayOfWeek: Int = java.util.Calendar.getInstance(locale).firstDayOfWeek - 1

    override fun number(value: Int, digits: Int): String = java.text.NumberFormat.getIntegerInstance(locale).apply {
        isGroupingUsed = false
        minimumIntegerDigits = digits
    }.format(value.toLong())

    override fun numericPattern(): String = android.text.format.DateFormat.getBestDateTimePattern(locale, "yyyyMMdd")
}

// ── Calendar arithmetic ──────────────────────────────────────────────────────

internal fun tanreiDaysInMonth(year: Int, month: Int): Int = when (month) {
    2 -> if ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0) 29 else 28
    4, 6, 9, 11 -> 30
    else -> 31
}

/** Days since 1970-01-01 (the proleptic Gregorian calendar). */
internal val TanreiDate.epochDay: Long
    get() {
        val y = (if (month <= 2) year - 1 else year).toLong()
        val era = Math.floorDiv(y, 400L)
        val yoe = y - era * 400
        val mp = (month + 9) % 12
        val doy = (153 * mp + 2) / 5 + day - 1
        val doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146_097 + doe - 719_468
    }

/** The date [days] after 1970-01-01. */
internal fun tanreiDateOfEpochDay(days: Long): TanreiDate {
    val z = days + 719_468
    val era = Math.floorDiv(z, 146_097L)
    val doe = z - era * 146_097
    val yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365
    val doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
    val mp = (5 * doy + 2) / 153
    val day = (doy - (153 * mp + 2) / 5 + 1).toInt()
    val month = (if (mp < 10) mp + 3 else mp - 9).toInt()
    val year = (yoe + era * 400 + if (month <= 2) 1 else 0).toInt()
    return TanreiDate(year, month, day)
}

/** The weekday, 0 (Sunday) to 6. */
internal val TanreiDate.weekday: Int get() = Math.floorMod(epochDay + EPOCH_WEEKDAY, DAYS_IN_WEEK.toLong()).toInt()

/** [days] later (earlier when negative); stays at the ends of years 1 to 9999. */
internal fun TanreiDate.plusDays(days: Int): TanreiDate {
    val target = epochDay + days
    return when {
        target < FIRST_EPOCH_DAY -> tanreiDateOfEpochDay(FIRST_EPOCH_DAY)
        target > LAST_EPOCH_DAY -> tanreiDateOfEpochDay(LAST_EPOCH_DAY)
        else -> tanreiDateOfEpochDay(target)
    }
}

/** The same day [months] later, or the last day of that month when it is shorter. */
internal fun TanreiDate.plusMonths(months: Int): TanreiDate {
    val month = (calendarMonth + months).let { if (it.year < FIRST_YEAR) TanreiCalendarMonth(FIRST_YEAR, 1) else if (it.year > LAST_YEAR) TanreiCalendarMonth(LAST_YEAR, MONTHS) else it }
    return TanreiDate(month.year, month.month, minOf(day, month.length))
}

// ── Constants: the calendar's, not design values ─────────────────────────────

private const val YEAR_FACTOR = 10_000
private const val MONTH_FACTOR = 100
private const val MONTHS_PACKED = 100
private const val MONTHS = 12
private const val FIRST_YEAR = 1
private const val LAST_YEAR = 9999
private const val DAYS_IN_WEEK = 7
private const val GRID_ROWS = 6
private const val YEARS_PER_ROW = 3
private const val FIRST_LISTED_YEAR = 1900
private const val LAST_LISTED_YEAR = 2100
private const val EPOCH_WEEKDAY = 4L // 1970-01-01 was a Thursday.
private const val FIRST_SUNDAY_EPOCH_DAY = 3L
private const val MILLIS_PER_DAY = 86_400_000L
private val FIRST_EPOCH_DAY = TanreiDate(FIRST_YEAR, 1, 1).epochDay
private val LAST_EPOCH_DAY = TanreiDate(LAST_YEAR, MONTHS, 31).epochDay
private val ISO_DATE = Regex("""(\d{4})-(\d{2})-(\d{2})""")
private const val RANGE_DASH = " – "
private const val HALF = 0.5f
private const val HALF_TURN = 180f
private const val CHEVRON_LEFT_GLYPH = "chevron_left"
private const val CHEVRON_RIGHT_GLYPH = "chevron_right"
private const val EXPAND_GLYPH = "expand_more"
private const val KEYBOARD_GLYPH = "keyboard"
private const val CALENDAR_GLYPH = "calendar_month"

/** A day, a year and the view toggle draw no shadow: they have no elevation tokens. */
private val NoShadow: List<io.github.chnotchy.tanrei.tokens.TanreiShadowLayer> = emptyList()
