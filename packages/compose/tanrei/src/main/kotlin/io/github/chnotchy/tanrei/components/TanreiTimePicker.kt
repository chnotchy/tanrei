package io.github.chnotchy.tanrei.components

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import androidx.annotation.RequiresApi
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.rememberTransition
import androidx.compose.animation.core.updateTransition
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.addOutline
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEvent
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.AlignmentLine
import androidx.compose.ui.layout.IntrinsicMeasurable
import androidx.compose.ui.layout.IntrinsicMeasureScope
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Measurable
import androidx.compose.ui.layout.MeasurePolicy
import androidx.compose.ui.layout.MeasureResult
import androidx.compose.ui.layout.MeasureScope
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.setProgress
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.max
import androidx.compose.ui.window.DialogWindowProvider
import io.github.chnotchy.tanrei.primitives.TanreiInteraction
import io.github.chnotchy.tanrei.primitives.TanreiModalSheetWindow
import io.github.chnotchy.tanrei.primitives.TanreiNamedGlyph
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiRipple
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.primitives.tanreiSideCornerShape
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldSize
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldVariant
import io.github.chnotchy.tanrei.tokens.TanreiTimePickerCondition
import io.github.chnotchy.tanrei.tokens.TanreiTimePickerConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiTimePickerTokens
import java.time.LocalTime
import java.util.Locale
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

/*
 * `specs/time-picker.spec.json` (TMP-1…29) on Compose, as `platforms.compose` maps it: `TanreiTimePicker(visible, onClose,
 * modifier, value, onChange, hourCycle, entryMode, unit, layout, locale, labels)`. A time of day is `TanreiTime` — an
 * hour and a minute, with no date, no seconds and no time zone. The picker is a modal overlay in a `Dialog` window
 * (`TanreiModalSheetWindow`, as the modal date picker's: the window's own dim and animation off, the scrim and the motion
 * Tanrei's, the window under it hidden and counted as a modal dialog). Focus moves in when it opens and goes back when it
 * closes; the window keeps it in. The caller keeps the value and closes the picker from `onClose`, which carries the reason.
 *
 * Every design value comes from the current system's [TanreiTimePickerTokens] (`TanreiTheme.tokens.timePicker`). A
 * selector and a period segment are `TanreiButton`'s chain — press and press-hold, pressed feedback and ripple, keyboard
 * focus ring, container, corner smoothing — drawn from `conditions[condition][state]` and `opacity(state)`. The placed
 * components (the entry-mode icon button, Cancel and OK, the text fields) are whole Tanrei components with their own
 * tokens. The dial's numbers are the scale of one control, not items. Locale data (the
 * periods' names, the digits, the separator, the preferred clock and where the period goes) comes from
 * `android.text.format.DateFormat.getBestDateTimePattern` and `android.icu` (`java.text` on API 23): [TanreiTimeText].
 */

// ── Times ────────────────────────────────────────────────────────────────────

/**
 * A time of day — an hour (0 to 23) and a minute (0 to 59), with no date, no seconds and no time zone. Tanrei's own value
 * class: `java.time.LocalTime` needs API 26 (this package supports 23). Ordered by time; [toString] is its 24-hour form,
 * "HH:MM" ("19:30"), as an HTML time input holds it.
 *
 * Constructing a time that does not exist (hour 24, minute 60) throws; [of] and [parse] answer null instead.
 */
@JvmInline
public value class TanreiTime private constructor(private val packed: Int) : Comparable<TanreiTime> {
    /** The time [hour]:[minute]; throws [IllegalArgumentException] when [hour] is not 0 to 23 or [minute] not 0 to 59. */
    public constructor(hour: Int, minute: Int) : this(pack(hour, minute))

    /** The hour, 0 to 23. */
    public val hour: Int get() = packed / MINUTES_PER_HOUR

    /** The minute, 0 to 59. */
    public val minute: Int get() = packed % MINUTES_PER_HOUR

    override fun compareTo(other: TanreiTime): Int = packed.compareTo(other.packed)

    /** The 24-hour time, "HH:MM": "07:30", "19:30". */
    override fun toString(): String = String.format(Locale.ROOT, "%02d:%02d", hour, minute)

    /** The same time as a `java.time.LocalTime` (API 26 and above). */
    @RequiresApi(Build.VERSION_CODES.O)
    public fun toLocalTime(): LocalTime = LocalTime.of(hour, minute)

    public companion object {
        /** The time [hour]:[minute], or null when it does not exist. */
        public fun of(hour: Int, minute: Int): TanreiTime? = if (exists(hour, minute)) TanreiTime(hour, minute) else null

        /** A 24-hour "HH:MM" time ("19:30": two-digit hour and minute), or null for anything else ("7:30", "24:00", seconds). */
        public fun parse(text: String): TanreiTime? {
            val match = HH_MM.matchEntire(text) ?: return null
            val (hour, minute) = match.destructured
            return of(hour.toInt(), minute.toInt())
        }

        private fun pack(hour: Int, minute: Int): Int {
            require(exists(hour, minute)) { "$hour:$minute is not a time of day (hours 0 to 23, minutes 0 to 59)" }
            return hour * MINUTES_PER_HOUR + minute
        }

        private fun exists(hour: Int, minute: Int): Boolean = hour in 0 until HOURS_PER_DAY && minute in 0 until MINUTES_PER_HOUR
    }
}

/** The spec's `hourCycle`. Closed: every value the spec defines is here, so no unknown one can be passed (TMP-29). */
public enum class TanreiTimePickerHourCycle {
    /** The locale's preferred clock — or the one the person chose for the whole device, which wins (TMP-6). */
    Locale,

    /** Hours 1 to 12 with a period (AM, PM). */
    H12,

    /** Hours 00 to 23. */
    H23,
}

/** The spec's `entryMode`: how the picker opens. Closed. */
public enum class TanreiTimePickerEntryMode {
    /** On the clock dial. */
    Dial,

    /** With text fields to type the time in. */
    Text,
}

/** The spec's `unit`: the unit the dial shows, and the selector that takes focus, when the picker opens. Closed. */
public enum class TanreiTimePickerUnit {
    Hour,
    Minute,
}

/** The spec's `layout`. Closed. */
public enum class TanreiTimePickerLayout {
    /** Horizontal only when the window is too short for vertical and wide enough for horizontal (TMP-7). */
    Auto,

    /** The time above the dial. */
    Vertical,

    /** The time and the actions beside the dial, for a short window (a phone held sideways). */
    Horizontal,
}

/**
 * Why the picker asks to be closed (the spec's `close`, TMP-4): its reasons `escape`, `back`, `outside`, `cancel` and
 * `confirm`, in Kotlin's casing. Only [Confirm] follows a commit.
 */
public enum class TanreiTimePickerCloseReason {
    /** Escape. */
    Escape,

    /** The platform's back. */
    Back,

    /** A press on the scrim. */
    Outside,

    /** Cancel. */
    Cancel,

    /** OK, after the change it committed (if any). */
    Confirm,
}

/**
 * Every word the picker shows or announces that is not locale data (TMP-27), with the spec's English defaults. The field
 * names are the spec's props; a product in another language sets them.
 *
 * @property label names the picker: its surface's accessible name and the line at its top.
 * @property hourLabel the hour selector's name and the hour field's label.
 * @property minuteLabel the minute selector's name and the minute field's label.
 * @property confirmLabel OK's label.
 * @property cancelLabel Cancel's label.
 * @property textEntryLabel the entry-mode toggle's name while the dial is shown.
 * @property dialEntryLabel the entry-mode toggle's name while text entry is shown.
 * @property invalidText a field's error when its text is not a number of its unit.
 */
@Immutable
public data class TanreiTimePickerLabels(
    public val label: String = "Select time",
    public val hourLabel: String = "Hour",
    public val minuteLabel: String = "Minute",
    public val confirmLabel: String = "OK",
    public val cancelLabel: String = "Cancel",
    public val textEntryLabel: String = "Switch to text entry",
    public val dialEntryLabel: String = "Switch to clock",
    public val invalidText: String = "Enter a valid time",
)

// ── The picker ───────────────────────────────────────────────────────────────

/**
 * Lets a person choose a time of day, in hours and minutes, on a clock dial or by typing it, in a dialog. Implements
 * `specs/time-picker.spec.json`.
 *
 * @param visible the spec's `open`. The product opens it and closes it: set it to false when [onClose] asks (TMP-4).
 *   Kept a parameter so that the close motion can run before the window goes.
 * @param onClose the spec's `close`: the picker asks to be closed, and says why ([TanreiTimePickerCloseReason]). Called
 *   once per request, after [onChange] when both are called.
 * @param modifier applied to the picker's surface.
 * @param value the chosen time; null for none — the picker then starts from the device's current time (TMP-5).
 * @param onChange the spec's `change`: OK committed a time that differs from [value] as it is when OK is activated — a
 *   value set while the picker was open included — (or [value] was null). The caller keeps the state (hoisting).
 * @param hourCycle [TanreiTimePickerHourCycle.Locale] (default), `H12` or `H23`. [value] is 24-hour in every cycle.
 * @param entryMode the dial (default) or text entry, when the picker opens; the person can switch while it is open.
 * @param unit the unit the dial shows, and the selector that takes focus, when the picker opens (the hour by default).
 * @param layout [TanreiTimePickerLayout.Auto] (default), `Vertical` or `Horizontal`.
 * @param locale the periods' names, the digits, the separator and the preferred clock; null takes
 *   `LocalConfiguration`'s first locale.
 * @param labels every word the picker shows or announces — its name `label` among them — with English defaults.
 */
@Composable
public fun TanreiTimePicker(
    visible: Boolean,
    onClose: (TanreiTimePickerCloseReason) -> Unit,
    modifier: Modifier = Modifier,
    value: TanreiTime? = null,
    onChange: (TanreiTime) -> Unit = {},
    hourCycle: TanreiTimePickerHourCycle = TanreiTimePickerHourCycle.Locale,
    entryMode: TanreiTimePickerEntryMode = TanreiTimePickerEntryMode.Dial,
    unit: TanreiTimePickerUnit = TanreiTimePickerUnit.Hour,
    layout: TanreiTimePickerLayout = TanreiTimePickerLayout.Auto,
    locale: Locale? = null,
    labels: TanreiTimePickerLabels = TanreiTimePickerLabels(),
) {
    val props = TimePickerProps(value, hourCycle, entryMode, unit, layout, locale, labels)
    val tokens = TanreiTheme.tokens.timePicker
    val state = remember { MutableTransitionState(false) }
    state.targetState = visible
    val close by rememberUpdatedState(onClose)
    val change by rememberUpdatedState(onChange)
    val open by rememberUpdatedState(visible)
    if (!state.currentState && !state.targetState) return
    val request: (TanreiTimePickerCloseReason) -> Unit = { reason -> if (open) close(reason) }
    // TMP-1: a Dialog window over everything, the window under it inert and hidden; TMP-4: the platform's back.
    TanreiModalSheetWindow(onBack = { request(TanreiTimePickerCloseReason.Back) }, backEnabled = true) {
        // TMP-3: focus goes back when the picker closes, not when its motion ends — a closing window takes no focus and
        // no touch, so the window under it has them again while the picker fades out.
        val window = (LocalView.current.parent as? DialogWindowProvider)?.window
        val closing = !state.targetState
        SideEffect {
            val flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
            if (closing) window?.addFlags(flags) else window?.clearFlags(flags)
        }
        val shown = rememberTanreiTimePickerShown(state, tokens)
        TanreiTimePickerModalArea(
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

/** The props of one picker, as the spec names them (the Compose types). */
@Immutable
internal data class TimePickerProps(
    val value: TanreiTime? = null,
    val hourCycle: TanreiTimePickerHourCycle = TanreiTimePickerHourCycle.Locale,
    val entryMode: TanreiTimePickerEntryMode = TanreiTimePickerEntryMode.Dial,
    val unit: TanreiTimePickerUnit = TanreiTimePickerUnit.Hour,
    val layout: TanreiTimePickerLayout = TanreiTimePickerLayout.Auto,
    val locale: Locale? = null,
    val labels: TanreiTimePickerLabels = TanreiTimePickerLabels(),
)

/**
 * TMP-25's timing: how far the picker is shown, 0 to 1 — rising over `motion.open-duration` with `motion.open-easing`
 * while [state] opens, falling over `motion.close-duration` with `motion.close-easing` while it closes; at once where
 * motion is reduced (Android's setting — the animator duration scale — removes every animation, this one included).
 */
@Composable
internal fun rememberTanreiTimePickerShown(state: MutableTransitionState<Boolean>, tokens: TanreiTimePickerTokens): State<Float> {
    val transition = rememberTransition(state, label = "time-picker")
    return transition.animateFloat(
        transitionSpec = {
            if (targetState) tanreiTween(tokens.motionOpenDuration, tokens.motionOpenEasing) else tanreiTween(tokens.motionCloseDuration, tokens.motionCloseEasing)
        },
        label = "shown",
    ) { open -> if (open) 1f else 0f }
}

/**
 * The picker as it is drawn while open, in place — no window, no motion, no focus move: the test-only harness of TMP-1's
 * `verify` that the baselines and most behaviour tests draw. It draws its scrim over everything it is given and centres
 * its surface in it (the 480 × 640 stage, 720 × 480 for the horizontal fixture). It is fully operable.
 */
@Composable
internal fun TanreiTimePickerContent(
    modifier: Modifier = Modifier,
    props: TimePickerProps = TimePickerProps(),
    onClose: (TanreiTimePickerCloseReason) -> Unit = {},
    onChange: (TanreiTime) -> Unit = {},
) {
    val close by rememberUpdatedState(onClose)
    val change by rememberUpdatedState(onChange)
    TanreiTimePickerModalArea(props, { close(it) }, { change(it) }, modifier, shown = { 1f }, entering = true, moveFocusIn = false)
}

/**
 * TMP-1: the scrim over everything it is given (`scrim.color`, fading with [shown]; a press on it is `Outside`), and the
 * surface centred in the safe area, `container.margin` from every edge and from the keyboard, fading with [shown] and —
 * while [entering] — growing about its centre from `motion.enter-scale` (TMP-25).
 */
@Composable
private fun TanreiTimePickerModalArea(
    props: TimePickerProps,
    onClose: (TanreiTimePickerCloseReason) -> Unit,
    onChange: (TanreiTime) -> Unit,
    modifier: Modifier,
    shown: () -> Float,
    entering: Boolean,
    moveFocusIn: Boolean,
) {
    val tokens = TanreiTheme.tokens.timePicker
    val scrim = tokens.scrimColor.color
    val close by rememberUpdatedState(onClose)
    Box(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer { alpha = shown().coerceIn(0f, 1f) }
                .drawBehind { if (scrim.isDrawn) drawRect(scrim) }
                .pointerInput(Unit) { detectTapGestures { close(TanreiTimePickerCloseReason.Outside) } }
                .clearAndSetSemantics {},
        )
        BoxWithConstraints(
            Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .padding(tokens.containerMargin),
            contentAlignment = Alignment.Center,
        ) {
            TanreiTimePickerBody(
                props = props,
                onClose = onClose,
                onChange = onChange,
                // The motion wraps the whole surface, the product's modifier included.
                modifier = Modifier.graphicsLayer {
                    val value = shown().coerceIn(0f, 1f)
                    alpha = value
                    // Grows about its centre while it enters; it only fades as it leaves.
                    val scale = if (entering) tokens.motionEnterScale + (1f - tokens.motionEnterScale) * value else 1f
                    scaleX = scale
                    scaleY = scale
                }.then(modifier),
                roomWidth = constraints.maxWidth,
                roomHeight = constraints.maxHeight,
                moveFocusIn = moveFocusIn,
            )
        }
    }
}

// ── Configuration: the props read once (TMP-6, TMP-27, TMP-29) ──────────────

/** What the picker reads from its props: the clock in use, the locale's forms, the committed time, the words. */
internal class TimePickerConfig(
    /** The 12-hour clock (1 to 12 and a period) is in use; otherwise 00 to 23. */
    val twelve: Boolean,
    val entryMode: TanreiTimePickerEntryMode,
    val unit: TanreiTimePickerUnit,
    val layout: TanreiTimePickerLayout,
    val text: TanreiTimeText,
    val committed: TanreiTime?,
    val labels: TanreiTimePickerLabels,
)

/**
 * TMP-6: whether the 12-hour clock is used. [H12][TanreiTimePickerHourCycle.H12] and [H23][TanreiTimePickerHourCycle.H23]
 * say so; `Locale` takes [device] — the person's choice for the whole device (true: 12-hour), null where none is
 * reported — over [localeTwelve], the locale's preferred clock (a locale that counts 0 to 11 is 12-hour, 1 to 24 is 24-hour).
 */
internal fun tanreiTimePickerTwelve(hourCycle: TanreiTimePickerHourCycle, device: Boolean?, localeTwelve: Boolean): Boolean = when (hourCycle) {
    TanreiTimePickerHourCycle.H12 -> true
    TanreiTimePickerHourCycle.H23 -> false
    TanreiTimePickerHourCycle.Locale -> device ?: localeTwelve
}

/**
 * TMP-6: the device's 12/24-hour choice, true for 12-hour. The person's own choice (`Settings.System.TIME_12_24`) when
 * they made one; for the platform's current locale ([current]), `DateFormat.is24HourFormat` — the device's answer for
 * it; otherwise null, and the picker's locale decides.
 */
internal fun tanreiDeviceTwelve(context: Context, current: Boolean): Boolean? {
    val chosen = runCatching { Settings.System.getString(context.contentResolver, Settings.System.TIME_12_24) }.getOrNull()
    return when {
        chosen == "12" -> true
        chosen == "24" -> false
        current -> !android.text.format.DateFormat.is24HourFormat(context)
        else -> null
    }
}

private val android.content.res.Configuration.primaryTimeLocale: Locale
    get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) locales[0] else @Suppress("DEPRECATION") locale

// ── The session: what the picker holds while it is open ─────────────────────

/**
 * One opening of the picker: its pending time (TMP-5), the unit the dial shows, the entry shown, the fields' texts and
 * errors, and the focus requests of its parts. Created when the picker opens, so a value the product sets while it is
 * open does not change the pending time (OK compares with that value all the same — [TimePickerActions.confirm]).
 */
@Stable
internal class TimePickerSession(config: TimePickerConfig, now: TanreiTime) {
    var pending: TanreiTime by mutableStateOf(config.committed ?: now)
    var unit: TanreiTimePickerUnit by mutableStateOf(config.unit)
    var entry: TanreiTimePickerEntryMode by mutableStateOf(config.entryMode)

    /** A press or a drag is on the dial: the handle follows it without animation (TMP-14). */
    var dragging: Boolean by mutableStateOf(false)
    val texts = mutableStateListOf(config.text.hourText(pending.hour, config.twelve), config.text.minuteText(pending.minute))
    val errors = mutableStateListOf(false, false)

    /** The part that has focus now (`hour`, `period:0`, `field:1` …); [lastFocused] the last one that had it. Never drawn. */
    var focusedPart: String? = null
    var lastFocused: String? = null

    /** The part focus is asked to move to, after the frame that composes it. */
    var focusRequest: Pair<String, Int>? by mutableStateOf(null)
    private var requests = 0
    private val requesters = HashMap<String, FocusRequester>()

    fun requester(key: String): FocusRequester = requesters.getOrPut(key) { FocusRequester() }

    fun focus(key: String) {
        focusRequest = key to ++requests
    }

    /**
     * TMP-2: the selector of unit while the dial is shown, the hour field in text entry — as the props name them when the
     * picker opens (a window focusing its first element on its own must not change the answer).
     */
    val openingTarget: String = if (config.entryMode == TanreiTimePickerEntryMode.Text) FIELD_KEYS[0] else unitKey(config.unit)
}

private fun unitKey(unit: TanreiTimePickerUnit) = if (unit == TanreiTimePickerUnit.Hour) HOUR_KEY else MINUTE_KEY
private fun periodKey(period: Int) = "period:$period"
private const val HOUR_KEY = "hour"
private const val MINUTE_KEY = "minute"
private const val ENTRY_TOGGLE_KEY = "entry-toggle"
private const val CANCEL_KEY = "cancel"
private const val CONFIRM_KEY = "confirm"
private val FIELD_KEYS = listOf("field:0", "field:1")

/** The 12-hour clock's hour (1 to 12) of a 24-hour [hour]. */
internal fun tanreiShownHour12(hour: Int): Int = (hour + HOURS_12 - 1) % HOURS_12 + 1

/** The period of a 24-hour [hour]: 0 before noon, 1 after. */
internal fun tanreiPeriodOf(hour: Int): Int = if (hour >= HOURS_12) 1 else 0

/** The 24-hour hour of [shown] (1 to 12) in [period] (0 before noon, 1 after). */
internal fun tanreiHourOf12(shown: Int, period: Int): Int = shown % HOURS_12 + HOURS_12 * period

/**
 * TMP-16: [time] with [unit] [delta] later (earlier when negative), wrapping from the last value to the first and back
 * without changing the other unit or the period (12 to 1 and 23 to 00 for hours, 59 to 00 for minutes).
 */
internal fun tanreiStepTime(time: TanreiTime, unit: TanreiTimePickerUnit, delta: Int, twelve: Boolean): TanreiTime = when {
    unit == TanreiTimePickerUnit.Minute -> TanreiTime(time.hour, Math.floorMod(time.minute + delta, MINUTES_PER_HOUR))
    twelve -> TanreiTime(tanreiHourOf12(Math.floorMod(tanreiShownHour12(time.hour) - 1 + delta, HOURS_12) + 1, tanreiPeriodOf(time.hour)), time.minute)
    else -> TanreiTime(Math.floorMod(time.hour + delta, HOURS_PER_DAY), time.minute)
}

/**
 * TMP-16: where a key moves a selector's value (null for another key): Up and Right one later, Down and Left one earlier,
 * Page Up and Page Down five minutes (the minute selector only), Home and End the first and last value of the unit (1 and
 * 12 in the same period, 00 and 23, 00 and 59).
 */
internal fun tanreiTimeKeyTarget(key: Key, unit: TanreiTimePickerUnit, time: TanreiTime, twelve: Boolean): TanreiTime? {
    val minute = unit == TanreiTimePickerUnit.Minute
    return when (key) {
        Key.DirectionUp, Key.DirectionRight -> tanreiStepTime(time, unit, 1, twelve)
        Key.DirectionDown, Key.DirectionLeft -> tanreiStepTime(time, unit, -1, twelve)
        Key.PageUp -> if (minute) tanreiStepTime(time, unit, MINUTE_PAGE, twelve) else null
        Key.PageDown -> if (minute) tanreiStepTime(time, unit, -MINUTE_PAGE, twelve) else null
        Key.MoveHome -> when {
            minute -> TanreiTime(time.hour, 0)
            twelve -> TanreiTime(tanreiHourOf12(1, tanreiPeriodOf(time.hour)), time.minute)
            else -> TanreiTime(0, time.minute)
        }
        Key.MoveEnd -> when {
            minute -> TanreiTime(time.hour, MINUTES_PER_HOUR - 1)
            twelve -> TanreiTime(tanreiHourOf12(HOURS_12, tanreiPeriodOf(time.hour)), time.minute)
            else -> TanreiTime(HOURS_PER_DAY - 1, time.minute)
        }
        else -> null
    }
}

/**
 * TMP-14: the value nearest a pointer at ([dx], [dy]) from the dial's centre — the angle clockwise from the top; on the
 * hour dial of the 24-hour clock, on the ring ([outer] or [inner] radius) nearer the pointer's distance. [time] keeps
 * the other unit and, for the 12-hour clock, the period.
 */
internal fun tanreiDialValue(dx: Float, dy: Float, unit: TanreiTimePickerUnit, time: TanreiTime, twelve: Boolean, outer: Float, inner: Float): TanreiTime {
    val degrees = (Math.toDegrees(atan2(dx.toDouble(), (-dy).toDouble())) + FULL_TURN) % FULL_TURN
    if (unit == TanreiTimePickerUnit.Minute) return TanreiTime(time.hour, (degrees / DEGREES_PER_MINUTE).roundToInt() % MINUTES_PER_HOUR)
    val index = (degrees / DEGREES_PER_HOUR).roundToInt() % HOURS_12
    if (twelve) return TanreiTime(tanreiHourOf12(if (index == 0) HOURS_12 else index, tanreiPeriodOf(time.hour)), time.minute)
    val distance = hypot(dx, dy)
    return TanreiTime(if (abs(distance - inner) < abs(distance - outer)) index + HOURS_12 else index, time.minute)
}

/** Where a value lies on the dial (TMP-13): an angle in degrees clockwise from the top, and whether on the inner ring. */
internal data class TanreiDialPosition(val degrees: Float, val inner: Boolean)

/** TMP-12 / TMP-13: an hour at its number (the inner ring for 12 to 23 on the 24-hour clock); a minute at six degrees a minute. */
internal fun tanreiDialPosition(unit: TanreiTimePickerUnit, time: TanreiTime, twelve: Boolean): TanreiDialPosition =
    if (unit == TanreiTimePickerUnit.Minute) {
        TanreiDialPosition(time.minute * DEGREES_PER_MINUTE, inner = false)
    } else {
        TanreiDialPosition((time.hour % HOURS_12) * DEGREES_PER_HOUR, inner = !twelve && time.hour >= HOURS_12)
    }

/** The picker's operations on a session, with the config and the callbacks of this composition. */
private class TimePickerActions(
    val config: TimePickerConfig,
    val session: TimePickerSession,
    val close: (TanreiTimePickerCloseReason) -> Unit,
    val change: (TanreiTime) -> Unit,
) {
    val twelve: Boolean get() = config.twelve
    private val text get() = config.text

    /** Sets the pending time, and the fields' texts with it (TMP-23: they hold the pending hour and minute). */
    fun setTime(next: TanreiTime) {
        session.pending = next
        session.texts[0] = text.hourText(next.hour, twelve)
        session.texts[1] = text.minuteText(next.minute)
        session.errors[0] = false
        session.errors[1] = false
    }

    /** TMP-16: a selector is focused or pressed — its unit is shown on the dial. */
    fun showUnit(unit: TanreiTimePickerUnit) {
        session.unit = unit
    }

    /** TMP-11: a period keeps the hour's number (7 before noon becomes 7 after noon, 19:00). */
    fun choosePeriod(period: Int) {
        val pending = session.pending
        if (tanreiPeriodOf(pending.hour) == period) return
        session.pending = TanreiTime(tanreiHourOf12(tanreiShownHour12(pending.hour), period), pending.minute)
    }

    /** TMP-16: the keys of a focused selector. */
    fun selectorKey(event: KeyEvent, unit: TanreiTimePickerUnit): Boolean {
        if (event.type != KeyEventType.KeyDown) return false
        val next = tanreiTimeKeyTarget(event.key, unit, session.pending, twelve) ?: return false
        setTime(next)
        return true
    }

    /** TMP-16: assistive technology's set-progress — one later or earlier, wrapping past the ends of the range. */
    fun setProgress(unit: TanreiTimePickerUnit, target: Int, current: Int, range: IntRange): Boolean {
        if (target == current) return false
        val next = when {
            target > range.last -> range.first
            target < range.first -> range.last
            else -> target
        }
        setTime(tanreiStepTime(session.pending, unit, next - current, twelve))
        return true
    }

    /** TMP-11: Left and Right in the period selector choose the other segment, and focus moves to it. */
    fun periodKey(event: KeyEvent, period: Int): Boolean {
        if (event.type != KeyEventType.KeyDown) return false
        if (event.key != Key.DirectionLeft && event.key != Key.DirectionRight) return false
        val other = 1 - period
        choosePeriod(other)
        session.focus(periodKey(other))
        return true
    }

    /** TMP-14: a press or a drag on the dial sets the value under it, at once. */
    fun dialSet(next: TanreiTime) {
        session.dragging = true
        if (next != session.pending) setTime(next)
    }

    /** TMP-14: a press or a drag on the hour dial ends — the minute dial, and focus to the minute selector if it was on the hour's. */
    fun dialReleased() {
        session.dragging = false
        if (session.unit != TanreiTimePickerUnit.Hour) return
        session.unit = TanreiTimePickerUnit.Minute
        if (session.focusedPart == HOUR_KEY) session.focus(MINUTE_KEY)
    }

    /** TMP-24: switch between the dial and text entry, keep the pending time, and move focus to the hour field or selector. */
    fun toggleEntry() {
        val toText = session.entry == TanreiTimePickerEntryMode.Dial
        setTime(session.pending)
        session.unit = TanreiTimePickerUnit.Hour
        session.entry = if (toText) TanreiTimePickerEntryMode.Text else TanreiTimePickerEntryMode.Dial
        session.focus(if (toText) FIELD_KEYS[0] else HOUR_KEY)
    }

    /** TMP-23: a whole number of the field's unit (ASCII or the locale's digits), or null. */
    fun fieldNumber(index: Int, value: String): Int? {
        val number = text.wholeNumber(value) ?: return null
        val range = when {
            index == 1 -> 0 until MINUTES_PER_HOUR
            twelve -> 1..HOURS_12
            else -> 0 until HOURS_PER_DAY
        }
        return number.takeIf { it in range }
    }

    /** TMP-23: typing never reformats; a number of the unit becomes the pending hour or minute; the next edit clears an error. */
    fun fieldChanged(index: Int, value: String) {
        session.texts[index] = value
        session.errors[index] = false
        val number = fieldNumber(index, value) ?: return
        val pending = session.pending
        session.pending = when {
            index == 1 -> TanreiTime(pending.hour, number)
            twelve -> TanreiTime(tanreiHourOf12(number, tanreiPeriodOf(pending.hour)), pending.minute)
            else -> TanreiTime(number, pending.minute)
        }
    }

    /** TMP-23: a committed field whose text is not a number of its unit — empty included — is in error. */
    fun fieldCommitted(index: Int, value: String) {
        if (fieldNumber(index, value) == null) session.errors[index] = true
    }

    /** TMP-23: the action key moves from the hour field to the minute field, and there activates OK when it is enabled. */
    fun fieldAction(index: Int) {
        if (index == 0) session.focus(FIELD_KEYS[1]) else confirm()
    }

    /** TMP-5: OK is disabled while a field holds text that is not a number of its unit. */
    val confirmEnabled: Boolean
        get() = session.entry != TanreiTimePickerEntryMode.Text || (fieldNumber(0, session.texts[0]) != null && fieldNumber(1, session.texts[1]) != null)

    /**
     * TMP-5: change once when the pending time differs from value as it is NOW (or value is empty), then close. The
     * config is this composition's, so a value the product set while the picker was open is the one compared: the time
     * the person saw is what is committed.
     */
    fun confirm() {
        if (!confirmEnabled) return
        val pending = session.pending
        val current = config.committed
        if (current == null || pending != current) change(pending)
        close(TanreiTimePickerCloseReason.Confirm)
    }
}

// ── The surface ──────────────────────────────────────────────────────────────

/** The sizes the layout decision reads (TMP-7), in pixels, measured as the parts are laid out; -1 until then. */
@Stable
private class TimePickerMeasures {
    var labelWidth by mutableIntStateOf(-1)
    var labelHeight by mutableIntStateOf(-1)
    var displayWidth by mutableIntStateOf(-1)
    var displayHeight by mutableIntStateOf(-1)
    var actionsHeight by mutableIntStateOf(-1)

    val measured: Boolean get() = labelHeight >= 0 && displayHeight >= 0 && actionsHeight >= 0
}

/**
 * The picker's surface and everything in it: config and session, Escape (TMP-4), the vertical or horizontal layout
 * (TMP-7) and the scrolling of TMP-8. [roomWidth] and [roomHeight] (pixels) are the room it has; [moveFocusIn] moves focus
 * in once its layout is decided (TMP-2).
 */
@Composable
private fun TanreiTimePickerBody(
    props: TimePickerProps,
    onClose: (TanreiTimePickerCloseReason) -> Unit,
    onChange: (TanreiTime) -> Unit,
    modifier: Modifier,
    roomWidth: Int,
    roomHeight: Int,
    moveFocusIn: Boolean,
) {
    val system = TanreiTheme.tokens
    val tokens = system.timePicker
    val context = LocalContext.current
    val locale = props.locale ?: LocalConfiguration.current.primaryTimeLocale
    val text = remember(locale) { TanreiTimeText(locale) }
    val twelve = tanreiTimePickerTwelve(props.hourCycle, remember(props.locale) { tanreiDeviceTwelve(context, current = props.locale == null) }, text.localeTwelve)
    val config = TimePickerConfig(twelve, props.entryMode, props.unit, props.layout, text, props.value, props.labels)
    // TMP-29: still opens; reported in debuggable apps.
    if (props.labels.label.isBlank()) TanreiReportMissingName("TanreiTimePicker", "labels.label", what = "a picker without a label")
    // TMP-5: the device's time is read when the picker opens.
    val session = remember { TimePickerSession(config, tanreiDeviceTime()) }
    val actions = TimePickerActions(config, session, onClose, onChange)
    val measures = remember { TimePickerMeasures() }
    val density = LocalDensity.current

    // TMP-7: vertical, horizontal, or auto — horizontal only when vertical does not fit the room's height and horizontal
    // fits its width. The parts are measured as they are laid out; until then (and with room to spare) vertical.
    val dial = session.entry == TanreiTimePickerEntryMode.Dial
    val horizontal = dial && when (config.layout) {
        TanreiTimePickerLayout.Vertical -> false
        TanreiTimePickerLayout.Horizontal -> true
        TanreiTimePickerLayout.Auto -> with(density) {
            val padding = tokens.containerPadding.roundToPx()
            val gap = tokens.containerGap.roundToPx()
            val dialSize = tokens.dialContainerSize.roundToPx()
            val vertical = 2 * padding + measures.labelHeight + gap + measures.displayHeight + gap + dialSize + tokens.actionsMarginBlockStart.roundToPx() + measures.actionsHeight
            val across = 2 * padding + maxOf(measures.displayWidth, measures.labelWidth) + gap + dialSize
            measures.measured && roomHeight != Constraints.Infinity && roomHeight < vertical && roomWidth >= across
        }
    }
    val decided = !dial || config.layout != TanreiTimePickerLayout.Auto || measures.measured

    // TMP-2: focus moves in when the picker opens (once its layout is decided); and wherever a part asks for it, once
    // that part is composed. A change of layout re-creates the parts: focus goes back to the part that had it.
    val request = session.focusRequest
    LaunchedEffect(request) {
        if (request == null) return@LaunchedEffect
        withFrameNanos { }
        runCatching { session.requester(request.first).requestFocus() }
    }
    if (moveFocusIn) LaunchedEffect(decided) { if (decided) session.focus(session.openingTarget) }
    val focusedLayout = remember { intArrayOf(if (horizontal) 1 else 0) }
    LaunchedEffect(horizontal) {
        val now = if (horizontal) 1 else 0
        if (focusedLayout[0] != now) {
            focusedLayout[0] = now
            session.lastFocused?.let { session.focus(it) }
        }
    }

    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.containerShape, smoothing) { tanreiContainerShape(tokens.containerShape, smoothing) }
    val containerColor = tokens.containerColor.color
    val close by rememberUpdatedState(onClose)
    val maxWidth = if (roomWidth == Constraints.Infinity) Modifier else Modifier.widthIn(max = with(density) { roomWidth.toDp() })
    val maxHeight = if (roomHeight == Constraints.Infinity) Modifier else Modifier.heightIn(max = with(density) { roomHeight.toDp() })

    Box(
        modifier
            .then(maxWidth)
            .then(maxHeight)
            // TMP-26: a dialog named by label (in a window of its own).
            .semantics { if (props.labels.label.isNotBlank()) paneTitle = props.labels.label }
            // A press on the surface is the surface's: it never reaches the scrim.
            .pointerInput(Unit) { awaitPointerEventScope { while (true) awaitPointerEvent() } }
            // TMP-4: Escape, heard before the parts.
            .onPreviewKeyEvent { event ->
                if (event.key != Key.Escape) return@onPreviewKeyEvent false
                if (event.type == KeyEventType.KeyDown) close(TanreiTimePickerCloseReason.Escape)
                true
            }
            .tanreiElevation(tokens.containerElevation, shape)
            .tanreiContainer(shape, containerColor = { containerColor }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline)
            .clip(shape),
    ) {
        if (horizontal) {
            TimePickerHorizontal(actions, measures)
        } else {
            TimePickerVertical(actions, measures, roomHeight)
        }
    }
}

/** TMP-5: the device's current local time, to the minute. */
internal fun tanreiDeviceTime(): TanreiTime {
    val now = java.util.Calendar.getInstance()
    return TanreiTime(now.get(java.util.Calendar.HOUR_OF_DAY), now.get(java.util.Calendar.MINUTE))
}

/**
 * TMP-7 / TMP-8, vertical: the label at the top, then the time display and the dial (or the fields), centred,
 * `container.gap` apart, then the actions row `actions.margin-block-start` below; everything `container.padding` from the
 * edges. The label and the actions stay while the middle scrolls between them; when they alone leave no room for a
 * selector, everything scrolls together.
 */
@Composable
private fun TimePickerVertical(actions: TimePickerActions, measures: TimePickerMeasures, roomHeight: Int) {
    val system = TanreiTheme.tokens
    val tokens = system.timePicker
    val session = actions.session
    val density = LocalDensity.current
    val selectorHeight = with(density) { max(tokens.selectorContainerHeight, system.measure.targetTouch).roundToPx() }
    val fixed = with(density) { 2 * tokens.containerPadding.roundToPx() + tokens.actionsMarginBlockStart.roundToPx() } + measures.labelHeight + measures.actionsHeight
    val scrollAll = roomHeight != Constraints.Infinity && measures.measured && fixed + selectorHeight > roomHeight
    val all = rememberScrollState()
    val part = rememberScrollState()
    Column(
        (if (scrollAll) Modifier.verticalScroll(all) else Modifier).width(IntrinsicSize.Max),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.padding(start = tokens.containerPadding, end = tokens.containerPadding, top = tokens.containerPadding)) {
            TimePickerLabel(actions, measures)
        }
        val middle = if (scrollAll) Modifier else Modifier.weight(1f, fill = false).verticalScroll(part)
        Box(middle) {
            // The gap above the time display is inside the scrolling part: a keyboard-focused selector's ring has room.
            Column(
                Modifier.padding(start = tokens.containerPadding, end = tokens.containerPadding, top = tokens.containerGap),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(tokens.containerGap),
            ) {
                if (session.entry == TanreiTimePickerEntryMode.Text) {
                    TimePickerFields(actions)
                } else {
                    TimePickerDisplay(actions, measures)
                    TimePickerDial(actions)
                }
            }
        }
        Box(Modifier.fillMaxWidth().padding(start = tokens.containerPadding, end = tokens.containerPadding, top = tokens.actionsMarginBlockStart, bottom = tokens.containerPadding)) {
            TimePickerActionsRow(actions, measures)
        }
    }
}

/**
 * TMP-7, horizontal: two columns `container.gap` apart — at the start the label, the time display below it and the
 * actions row at its bottom; at the end the dial, centred vertically. It scrolls as a whole when the window is shorter.
 */
@Composable
private fun TimePickerHorizontal(actions: TimePickerActions, measures: TimePickerMeasures) {
    val tokens = TanreiTheme.tokens.timePicker
    Box(Modifier.verticalScroll(rememberScrollState())) {
        Row(
            Modifier.padding(tokens.containerPadding),
            horizontalArrangement = Arrangement.spacedBy(tokens.containerGap),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                Modifier.width(IntrinsicSize.Max).heightIn(min = tokens.dialContainerSize),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(tokens.containerGap)) {
                    TimePickerLabel(actions, measures)
                    TimePickerDisplay(actions, measures)
                }
                Box(Modifier.fillMaxWidth().padding(top = tokens.actionsMarginBlockStart)) {
                    TimePickerActionsRow(actions, measures)
                }
            }
            TimePickerDial(actions)
        }
    }
}

/** TMP-7: the picker's label, in `header.label.typescale` and `header.label.color`; it wraps and grows with text. */
@Composable
private fun TimePickerLabel(actions: TimePickerActions, measures: TimePickerMeasures) {
    val tokens = TanreiTheme.tokens.timePicker
    BasicText(
        actions.config.labels.label,
        modifier = Modifier.onSizeChanged {
            measures.labelWidth = it.width
            measures.labelHeight = it.height
        },
        style = tokens.headerLabelTypescale.toTextStyle().merge(TextStyle(color = tokens.headerLabelColor.color)),
    )
}

// ── The time display (TMP-9 … TMP-11, TMP-16 … TMP-22, TMP-26) ───────────────

/**
 * TMP-9 / TMP-10 / TMP-28: the hour selector, the separator and the minute selector, `selector.gap` apart, always in that
 * order from left to right; the period selector (12-hour clock) where the locale writes the period — before the hour or
 * after the minutes, `period.margin-inline-start` from the selector beside it, in the layout direction; as tall as the
 * selectors, which grow with enlarged text.
 */
@Composable
private fun TimePickerDisplay(actions: TimePickerActions, measures: TimePickerMeasures) {
    val tokens = TanreiTheme.tokens.timePicker
    val config = actions.config
    val before = actions.twelve && config.text.periodBefore
    val after = actions.twelve && !config.text.periodBefore
    Row(
        Modifier
            .height(IntrinsicSize.Min)
            .onSizeChanged {
                measures.displayWidth = it.width
                measures.displayHeight = it.height
            },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (before) TimePickerPeriod(actions, beside = PeriodBeside.Selectors, Modifier.padding(end = tokens.periodMarginInlineStart).fillMaxHeight())
        // A time is written left to right in every layout direction (TMP-28).
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
            Row(Modifier.fillMaxHeight(), horizontalArrangement = Arrangement.spacedBy(tokens.selectorGap), verticalAlignment = Alignment.CenterVertically) {
                TimePickerSelector(actions, TanreiTimePickerUnit.Hour, Modifier.fillMaxHeight())
                TimePickerSeparator(actions, tokens.separatorTypescale.toTextStyle())
                TimePickerSelector(actions, TanreiTimePickerUnit.Minute, Modifier.fillMaxHeight())
            }
        }
        if (after) TimePickerPeriod(actions, beside = PeriodBeside.Selectors, Modifier.padding(start = tokens.periodMarginInlineStart).fillMaxHeight())
    }
}

/** TMP-9 / TMP-23: the locale's separator between the hours and the minutes, in [style] and `separator.color`; decorative. */
@Composable
private fun TimePickerSeparator(actions: TimePickerActions, style: TextStyle) {
    val tokens = TanreiTheme.tokens.timePicker
    BasicText(
        actions.config.text.separator,
        modifier = Modifier.clearAndSetSemantics {},
        style = style.merge(TextStyle(color = tokens.separatorColor.color, textAlign = TextAlign.Center)),
    )
}

/** What a selector or a period segment draws in its condition and state (TMP-17, TMP-19, TMP-20). */
private class TimePickerLook(
    val container: State<Color>,
    val label: State<Color>,
    val outline: State<Color>,
    val outlineWidth: Dp,
    val opacity: State<Float>,
    val ripple: TanreiRipple?,
)

/**
 * TMP-17, TMP-19, TMP-20: the part's colors from `conditions[condition][state]` — [part] picks the selector's or the
 * period's — the state that wins (pressed over keyboard-focused over hovered), held pressed for press-hold, the container
 * color with the state under the press where the system's pressed feedback says so, the ripple of the condition's pressed
 * container color — animated over the state duration and easing (entering pressed snaps; at once where motion is reduced).
 */
@Composable
private fun rememberTimePickerLook(condition: TanreiTimePickerCondition, interaction: TanreiInteraction, part: TimePickerPart): TimePickerLook {
    val system = TanreiTheme.tokens
    val tokens = system.timePicker
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val palette = tokens.conditions[condition]
    val drawn = palette[drawnStates.content]
    val motion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    return TimePickerLook(
        container = animateTanreiColorAsState(part.container(palette[drawnStates.container]).color, motion, label = "container"),
        label = animateTanreiColorAsState(part.label(drawn).color, motion, label = "label"),
        outline = animateTanreiColorAsState(part.outline(drawn)?.color ?: Color.Transparent, motion, label = "outline"),
        outlineWidth = if (part == TimePickerPart.Selector) drawn.selectorOutlineWidth else Dp.Hairline,
        opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity"),
        ripple = rememberTanreiRipple(
            feedback = feedback,
            interaction = interaction,
            color = part.container(palette.pressed).color,
            feedbackDurationMillis = tokens.motionFeedbackDuration,
            stateDurationMillis = tokens.motionStateDuration,
            stateEasing = tokens.motionStateEasing,
        ),
    )
}

/** Which part's tokens a look reads: the selector's or the period segment's. */
private enum class TimePickerPart {
    Selector,
    Period,
    ;

    fun container(tokens: TanreiTimePickerConditionStateTokens) = if (this == Selector) tokens.selectorContainerColor else tokens.periodContainerColor
    fun label(tokens: TanreiTimePickerConditionStateTokens) = if (this == Selector) tokens.selectorLabelColor else tokens.periodLabelColor
    fun outline(tokens: TanreiTimePickerConditionStateTokens) = if (this == Selector) tokens.selectorOutlineColor else null
}

/**
 * One selector (TMP-9, TMP-16 … TMP-22, TMP-26): the hour or the minute as the locale writes it, centred on a container at
 * least `selector.container.width` × `selector.container.height` (and the touch target) with `selector.container.shape`
 * corners, in the container, outline and label colors of its condition — selected while the dial shows its unit. A
 * focusable adjustable control named by `hourLabel` or `minuteLabel`, whose value is its text as drawn (with the period
 * in a 12-hour clock): `progressBarRangeInfo` and `setProgress`, the arrow keys, Page Up and Down, Home and End. Focus or
 * a press shows its unit on the dial.
 */
@Composable
private fun TimePickerSelector(actions: TimePickerActions, which: TanreiTimePickerUnit, modifier: Modifier) {
    val system = TanreiTheme.tokens
    val tokens = system.timePicker
    val config = actions.config
    val session = actions.session
    val source = remember { MutableInteractionSource() }
    val interaction = source.collectTanreiInteraction(enabled = true)
    val selected = session.entry == TanreiTimePickerEntryMode.Dial && session.unit == which
    val look = rememberTimePickerLook(if (selected) TanreiTimePickerCondition.Selected else TanreiTimePickerCondition.Unselected, interaction, TimePickerPart.Selector)
    val key = unitKey(which)
    val hour = which == TanreiTimePickerUnit.Hour
    val pending = session.pending
    val twelve = actions.twelve
    val shown = when {
        !hour -> config.text.minuteText(pending.minute)
        else -> config.text.hourText(pending.hour, twelve)
    }
    val periodName = config.text.periodNames[tanreiPeriodOf(pending.hour)]
    val valueText = when {
        hour && twelve && config.text.periodBefore -> "$periodName $shown"
        hour && twelve -> "$shown $periodName"
        else -> shown
    }
    val current = when {
        !hour -> pending.minute
        twelve -> tanreiShownHour12(pending.hour)
        else -> pending.hour
    }
    val range = when {
        !hour -> 0 until MINUTES_PER_HOUR
        twelve -> 1..HOURS_12
        else -> 0 until HOURS_PER_DAY
    }
    val name = if (hour) config.labels.hourLabel else config.labels.minuteLabel
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.selectorContainerShape, smoothing) { tanreiContainerShape(tokens.selectorContainerShape, smoothing) }
    val target = system.measure.targetTouch
    Box(
        modifier
            .semantics {
                contentDescription = name
                stateDescription = valueText
                progressBarRangeInfo = ProgressBarRangeInfo(current.toFloat(), range.first.toFloat()..range.last.toFloat(), steps = range.last - range.first - 1)
                setProgress { value -> actions.setProgress(which, value.roundToInt(), current, range) }
            }
            .focusRequester(session.requester(key))
            .onFocusChanged { state ->
                if (state.isFocused) {
                    session.focusedPart = key
                    session.lastFocused = key
                    actions.showUnit(which)
                } else if (session.focusedPart == key) {
                    session.focusedPart = null
                }
            }
            .onKeyEvent { event -> actions.selectorKey(event, which) }
            .clickable(interactionSource = source, indication = null) { actions.showUnit(which) }
            .tanreiPressInput(interaction.press)
            .tanreiRippleInput(look.ripple)
            .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, NoShadow)) { look.opacity.value }
            .tanreiFocusRing(source, cornerRadius = tokens.selectorContainerShape)
            .tanreiContainer(shape, containerColor = { look.container.value }, outlineColor = look.outline.value, outlineWidth = look.outlineWidth, ripple = look.ripple)
            // TMP-22: at least the target in each dimension; TMP-8: grows with enlarged text.
            .defaultMinSize(max(tokens.selectorContainerWidth, target), max(tokens.selectorContainerHeight, target)),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            shown,
            modifier = Modifier.clearAndSetSemantics {},
            style = tokens.selectorLabelTypescale.toTextStyle().merge(TextStyle(textAlign = TextAlign.Center)),
            color = { look.label.value },
        )
    }
}

/** Where the period selector sits: beside the selectors (as tall as they are) or beside the fields (as tall as one). */
private enum class PeriodBeside { Selectors, Fields }

/**
 * TMP-10 / TMP-11 / TMP-22 / TMP-26: two segments side by side, the one before noon first in the layout direction, each at
 * least `period.container.width` (and the touch target) wide, holding the locale's names of the periods centred in
 * `period.label.typescale`; a border of `period.outline.width` in `period.outline.color` around both and a line of the same
 * between them, the outer corners `period.container.shape`. A group of two radio buttons, one Tab stop (the chosen one).
 * Beside the selectors it is as tall as they are ([modifier] fills the row's height); beside the fields it is drawn as tall
 * as their containers (the height [TimePickerFields] gives it, less the reach) and reaches the touch target's height with a
 * hit area extending equally above and below its drawing.
 */
@Composable
private fun TimePickerPeriod(actions: TimePickerActions, beside: PeriodBeside, modifier: Modifier) {
    val system = TanreiTheme.tokens
    val tokens = system.timePicker
    // Beside the fields: the drawing is a field's height; the hit area reaches the target, centred on it.
    val reach = if (beside == PeriodBeside.Fields) timePickerPeriodReach() else 0.dp
    val smoothing = system.shape.cornerSmoothing
    val outerShape = remember(tokens.periodContainerShape, smoothing) { tanreiContainerShape(tokens.periodContainerShape, smoothing) }
    val outlineColor = tokens.periodOutlineColor.color
    val outlineWidth = tokens.periodOutlineWidth
    // Where the line between the segments is, in the group's own coordinates (pixels): read in the draw phase only.
    var boundary by remember { mutableFloatStateOf(-1f) }
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    Row(
        modifier
            .selectableGroup()
            .drawWithContent {
                drawContent()
                val inset = reach.toPx()
                val width = outlineWidth.toPx()
                if (!outlineColor.isDrawn || width <= 0f) return@drawWithContent
                val drawnSize = Size(size.width, size.height - 2 * inset)
                val half = width / 2
                val outline = outerShape.createOutline(Size(drawnSize.width - width, drawnSize.height - width), layoutDirection, this)
                val path = Path().apply { addOutline(outline) }
                path.translate(Offset(half, inset + half))
                drawPath(path, outlineColor, style = Stroke(width))
                if (boundary >= 0f) drawRect(outlineColor, topLeft = Offset(boundary - half, inset), size = Size(width, drawnSize.height))
            },
    ) {
        for (period in 0..1) {
            TimePickerPeriodSegment(
                actions = actions,
                period = period,
                beside = beside,
                reach = reach,
                // As tall as the selectors, or as the fields' containers (TMP-10): the parent gives the height.
                modifier = Modifier
                    .fillMaxHeight()
                    .then(
                        if (period == 0) {
                            Modifier.onPlaced { coordinates ->
                                val x = coordinates.positionInParent().x
                                boundary = if (rtl) x else x + coordinates.size.width
                            }
                        } else {
                            Modifier
                        },
                    ),
            )
        }
    }
}

/**
 * One period segment (TMP-10, TMP-11, TMP-17 … TMP-22): drawn from selected for the pending period and unselected for the
 * other; the outer corners of the selector (the start corners of the segment before noon, the end corners of the other).
 * A radio button named by the period's name, checked for the pending period; the arrows choose the other.
 */
@Composable
private fun TimePickerPeriodSegment(actions: TimePickerActions, period: Int, beside: PeriodBeside, reach: Dp, modifier: Modifier) {
    val system = TanreiTheme.tokens
    val tokens = system.timePicker
    val session = actions.session
    val source = remember { MutableInteractionSource() }
    val interaction = source.collectTanreiInteraction(enabled = true)
    val chosen = tanreiPeriodOf(session.pending.hour) == period
    val look = rememberTimePickerLook(if (chosen) TanreiTimePickerCondition.Selected else TanreiTimePickerCondition.Unselected, interaction, TimePickerPart.Period)
    val key = periodKey(period)
    val smoothing = system.shape.cornerSmoothing
    val radius = tokens.periodContainerShape
    val startRadius = if (period == 0) radius else 0.dp
    val endRadius = if (period == 0) 0.dp else radius
    val shape = remember(startRadius, endRadius, smoothing) { tanreiSideCornerShape(startRadius, endRadius, smoothing) }
    val target = system.measure.targetTouch
    val fieldHeight = system.textField.sizes[TanreiTextFieldSize.Large].containerHeight
    val name = actions.config.text.periodNames[period]
    Box(
        modifier
            .focusRequester(session.requester(key))
            // TMP-11: one Tab stop, the chosen segment (or the one focus is being moved to).
            .focusProperties { canFocus = chosen || session.focusRequest?.first == key }
            .onFocusChanged { state ->
                if (state.isFocused) {
                    session.focusedPart = key
                    session.lastFocused = key
                } else if (session.focusedPart == key) {
                    session.focusedPart = null
                }
            }
            .onKeyEvent { event -> actions.periodKey(event, period) }
            .selectable(selected = chosen, interactionSource = source, indication = null, role = Role.RadioButton) { actions.choosePeriod(period) }
            .tanreiPressInput(interaction.press)
            .tanreiRippleInput(look.ripple)
            // TMP-22: beside the fields the hit area reaches the target's height above and below the drawing.
            .then(if (reach > 0.dp) Modifier.tanreiVerticalReach(reach) else Modifier)
            .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, NoShadow)) { look.opacity.value }
            // Inside the segment, clear of the border the selector draws over its edge.
            .tanreiFocusRing(source, cornerRadius = startRadius, inside = true, endCornerRadius = endRadius, inset = tokens.periodOutlineWidth)
            .tanreiContainer(shape, containerColor = { look.container.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = look.ripple)
            .widthIn(min = max(tokens.periodContainerWidth, target))
            .then(if (beside == PeriodBeside.Fields) Modifier.heightIn(min = fieldHeight) else Modifier.heightIn(min = target)),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            name,
            modifier = Modifier.padding(horizontal = tokens.periodOutlineWidth),
            style = tokens.periodLabelTypescale.toTextStyle().merge(TextStyle(textAlign = TextAlign.Center)),
            color = { look.label.value },
            maxLines = 1,
        )
    }
}

/** A node [reach] taller above and below than what follows it, which is drawn centred in it: the hit area grows, the drawing does not. */
private fun Modifier.tanreiVerticalReach(reach: Dp): Modifier = layout { measurable, constraints ->
    val extra = reach.roundToPx()
    val placeable = measurable.measure(constraints.copy(minHeight = (constraints.minHeight - 2 * extra).coerceAtLeast(0), maxHeight = if (constraints.hasBoundedHeight) (constraints.maxHeight - 2 * extra).coerceAtLeast(0) else constraints.maxHeight))
    layout(placeable.width, placeable.height + 2 * extra) { placeable.place(0, extra) }
}

// ── Text entry (TMP-23) ──────────────────────────────────────────────────────

/**
 * TMP-23: two outlined large text fields of the number type with a maxLength of 2, labelled `hourLabel` and `minuteLabel`,
 * each `selector.container.width` wide, the separator between them `selector.gap` from each in `separator.color` and the
 * fields' input style; the period selector where TMP-10 places it (12-hour clock). Always left to right.
 *
 * Laid out by the fields' containers ([TanreiTextFieldContainerTop], [TanreiTextFieldContainerBottom]): the separator is
 * centred on them and the period drawn as tall as they are (TMP-10) — they grow with enlarged text and with a label that
 * wraps (TXF-13), and each field makes room for the other's label, so the two stay the same height.
 */
@Composable
private fun TimePickerFields(actions: TimePickerActions) {
    val system = TanreiTheme.tokens
    val tokens = system.timePicker
    val config = actions.config
    val session = actions.session
    val large = system.textField.sizes[TanreiTextFieldSize.Large]
    val before = actions.twelve && config.text.periodBefore
    val after = actions.twelve && !config.text.periodBefore
    val reach = timePickerPeriodReach()
    val gap = tokens.selectorGap
    val labels = listOf(config.labels.hourLabel, config.labels.minuteLabel)
    Layout(
        content = {
            if (before) TimePickerPeriod(actions, beside = PeriodBeside.Fields, Modifier.layoutId(FieldsPart.Period).padding(end = tokens.periodMarginInlineStart))
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr, LocalTanreiTextFieldLabelRoom provides labels) {
                for (index in 0..1) {
                    if (index == 1) {
                        Box(Modifier.layoutId(FieldsPart.Separator), contentAlignment = Alignment.Center) {
                            TimePickerSeparator(actions, large.inputTypescale.toTextStyle())
                        }
                    }
                    val keyboard = remember(index) {
                        KeyboardActions(
                            onDone = { actions.fieldAction(index) },
                            onNext = { actions.fieldAction(index) },
                            onGo = { actions.fieldAction(index) },
                            onSend = { actions.fieldAction(index) },
                            onSearch = { actions.fieldAction(index) },
                        )
                    }
                    val key = FIELD_KEYS[index]
                    TanreiTextField(
                        value = session.texts[index],
                        onValueChange = { actions.fieldChanged(index, it) },
                        label = labels[index],
                        modifier = Modifier
                            .layoutId(if (index == 0) FieldsPart.Hour else FieldsPart.Minute)
                            .width(tokens.selectorContainerWidth)
                            .focusRequester(session.requester(key))
                            .onFocusChanged { state ->
                                if (state.hasFocus) {
                                    session.focusedPart = key
                                    session.lastFocused = key
                                } else if (session.focusedPart == key) {
                                    session.focusedPart = null
                                }
                            },
                        variant = TanreiTextFieldVariant.Outlined,
                        size = TanreiTextFieldSize.Large,
                        type = TanreiTextFieldType.Number,
                        maxLength = FIELD_MAX_LENGTH,
                        errorText = if (session.errors[index]) config.labels.invalidText else "",
                        isError = session.errors[index],
                        onCommit = { actions.fieldCommitted(index, it) },
                        keyboardActions = keyboard,
                    )
                }
            }
            if (after) TimePickerPeriod(actions, beside = PeriodBeside.Fields, Modifier.layoutId(FieldsPart.Period).padding(start = tokens.periodMarginInlineStart))
        },
        measurePolicy = remember(before, reach, gap) { TimePickerFieldsPolicy(before, reach, gap) },
    )
}

/** The parts [TimePickerFields] lays out. */
private enum class FieldsPart { Period, Hour, Separator, Minute }

/**
 * How [TimePickerFields] lays out its parts: the fields and the separator left to right [gap] apart, the period before
 * them ([before]) or after them in the layout direction; everything aligned by the fields' containers. Intrinsic widths
 * (the picker's column asks) are the parts' side by side; intrinsic heights the tallest part.
 */
private class TimePickerFieldsPolicy(private val before: Boolean, private val reach: Dp, private val gap: Dp) : MeasurePolicy {
    override fun MeasureScope.measure(measurables: List<Measurable>, constraints: Constraints): MeasureResult {
        val loose = constraints.copy(minWidth = 0, minHeight = 0)
        fun part(id: FieldsPart) = measurables.firstOrNull { it.layoutId == id }
        val hour = part(FieldsPart.Hour)!!.measure(loose)
        val minute = part(FieldsPart.Minute)!!.measure(loose)
        val fields = listOf(hour, minute)
        // Each field's container, in its own layout.
        val tops = fields.map { p -> p[TanreiTextFieldContainerTop].takeIf { it != AlignmentLine.Unspecified } ?: 0 }
        val bottoms = fields.map { p -> p[TanreiTextFieldContainerBottom].takeIf { it != AlignmentLine.Unspecified } ?: p.height }
        val drawnHeight = fields.indices.maxOf { bottoms[it] - tops[it] }
        val reachPx = reach.roundToPx()
        // TMP-23: the separator centred on the containers; TMP-10: the period drawn as tall as they are, its hit area
        // reaching the target above and below (TMP-22).
        val separator = part(FieldsPart.Separator)!!.measure(Constraints(maxWidth = loose.maxWidth, minHeight = drawnHeight, maxHeight = drawnHeight))
        val period = part(FieldsPart.Period)?.measure(Constraints(maxWidth = loose.maxWidth, minHeight = drawnHeight + 2 * reachPx, maxHeight = drawnHeight + 2 * reachPx))
        val gapPx = gap.roundToPx()
        val groupWidth = hour.width + gapPx + separator.width + gapPx + minute.width
        val width = groupWidth + (period?.width ?: 0)
        val drawnTop = maxOf(tops.max(), reachPx)
        val height = maxOf(drawnTop - tops[0] + hour.height, drawnTop - tops[1] + minute.height, drawnTop - reachPx + (period?.height ?: 0))
        return layout(width, height) {
            // The fields are always left to right; the period is before or after them in the layout direction.
            val groupStart = if (before) period?.width ?: 0 else 0
            val groupX = if (layoutDirection == LayoutDirection.Rtl) width - groupStart - groupWidth else groupStart
            hour.place(groupX, drawnTop - tops[0])
            separator.place(groupX + hour.width + gapPx, drawnTop)
            minute.place(groupX + hour.width + gapPx + separator.width + gapPx, drawnTop - tops[1])
            period?.placeRelative(if (before) 0 else groupWidth, drawnTop - reachPx)
        }
    }

    override fun IntrinsicMeasureScope.minIntrinsicWidth(measurables: List<IntrinsicMeasurable>, height: Int): Int =
        measurables.sumOf { it.minIntrinsicWidth(height) } + 2 * gap.roundToPx()

    override fun IntrinsicMeasureScope.maxIntrinsicWidth(measurables: List<IntrinsicMeasurable>, height: Int): Int =
        measurables.sumOf { it.maxIntrinsicWidth(height) } + 2 * gap.roundToPx()

    override fun IntrinsicMeasureScope.minIntrinsicHeight(measurables: List<IntrinsicMeasurable>, width: Int): Int =
        measurables.maxOfOrNull { it.minIntrinsicHeight(Constraints.Infinity) } ?: 0

    override fun IntrinsicMeasureScope.maxIntrinsicHeight(measurables: List<IntrinsicMeasurable>, width: Int): Int =
        measurables.maxOfOrNull { it.maxIntrinsicHeight(Constraints.Infinity) } ?: 0
}

/** TMP-22: how far a period segment's hit area reaches above and below its drawing beside the fields (to the touch target). */
@Composable
private fun timePickerPeriodReach(): Dp {
    val system = TanreiTheme.tokens
    return ((system.measure.targetTouch - system.textField.sizes[TanreiTextFieldSize.Large].containerHeight) / 2).coerceAtLeast(0.dp)
}

// ── The actions row (TMP-24) ─────────────────────────────────────────────────

/**
 * TMP-24: the entry-mode toggle at the start — a standard medium Tanrei icon button showing `keyboard` (named
 * `textEntryLabel`) while the dial is shown and `schedule` (named `dialEntryLabel`) in text entry — and Cancel and OK at
 * the end, text-variant medium Tanrei Buttons, OK last, `actions.gap` apart. They keep their own tokens.
 */
@Composable
private fun TimePickerActionsRow(actions: TimePickerActions, measures: TimePickerMeasures) {
    val system = TanreiTheme.tokens
    val tokens = system.timePicker
    val session = actions.session
    val labels = actions.config.labels
    val dial = session.entry == TanreiTimePickerEntryMode.Dial
    val iconSize = system.iconButton.sizes[TanreiIconButtonSize.Medium].iconSize
    Row(
        Modifier.fillMaxWidth().onSizeChanged { measures.actionsHeight = it.height },
        horizontalArrangement = Arrangement.spacedBy(tokens.actionsGap),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TanreiIconButton(
            onClick = actions::toggleEntry,
            contentDescription = if (dial) labels.textEntryLabel else labels.dialEntryLabel,
            modifier = Modifier.timePickerPart(session, ENTRY_TOGGLE_KEY),
            variant = TanreiIconButtonVariant.Standard,
            size = TanreiIconButtonSize.Medium,
        ) {
            TanreiNamedGlyph(if (dial) KEYBOARD_GLYPH else SCHEDULE_GLYPH, LocalTanreiIconGlyph.current, iconSize, LocalTanreiContentColor.current)
        }
        Spacer(Modifier.weight(1f))
        TanreiButton(
            text = labels.cancelLabel,
            onClick = { actions.close(TanreiTimePickerCloseReason.Cancel) },
            modifier = Modifier.timePickerPart(session, CANCEL_KEY),
            variant = TanreiButtonVariant.Text,
            size = TanreiButtonSize.Medium,
        )
        TanreiButton(
            text = labels.confirmLabel,
            onClick = actions::confirm,
            modifier = Modifier.timePickerPart(session, CONFIRM_KEY),
            variant = TanreiButtonVariant.Text,
            size = TanreiButtonSize.Medium,
            enabled = actions.confirmEnabled,
        )
    }
}

/** A placed part's focus: its requester (the session can move focus to it) and whether focus is in it. */
private fun Modifier.timePickerPart(session: TimePickerSession, key: String): Modifier =
    focusRequester(session.requester(key)).onFocusChanged { state ->
        if (state.hasFocus) {
            session.focusedPart = key
            session.lastFocused = key
        } else if (session.focusedPart == key) {
            session.focusedPart = null
        }
    }

// ── The dial (TMP-12 … TMP-15) ───────────────────────────────────────────────

/**
 * TMP-12 … TMP-15: a circle of `dial.container.size` in `dial.container.color` holding twelve numbers clockwise from the
 * top in `dial.label.typescale` and `dial.label.color` — 12, 1 … 11 (12-hour); 00 … 11 outside and 12 … 23 on an inner
 * ring (24-hour); 00, 05 … 55 (minutes) — the outer ring's centred `dial.padding` + half the handle inside the edge, the
 * inner ring's a handle's size further in. The handle — `dial.handle.size` in `dial.handle.color` — over the pending
 * value, the track (`dial.track.width`, `dial.track.color`) from the centre to it and the centre dot (`dial.center.size`);
 * the part of a number under the handle in `dial.selected-label.color`, and a dot of that color in the handle for a minute
 * between two numbers. Always clockwise, never mirrored. A press or a drag sets the value under it (TMP-14); the numbers
 * cross-fade when the unit changes and the handle moves along the shorter arc (TMP-15). Hidden from assistive technology.
 */
@Composable
private fun TimePickerDial(actions: TimePickerActions) {
    val system = TanreiTheme.tokens
    val tokens = system.timePicker
    val config = actions.config
    val session = actions.session
    val twelve = actions.twelve
    val density = LocalDensity.current
    val sizePx = with(density) { tokens.dialContainerSize.toPx() }
    val handlePx = with(density) { tokens.dialHandleSize.toPx() }
    val outer = sizePx / 2 - with(density) { tokens.dialPadding.toPx() } - handlePx / 2
    val inner = outer - handlePx
    val face = tokens.dialContainerColor.color
    val labelColor = tokens.dialLabelColor.color
    val selectedColor = tokens.dialSelectedLabelColor.color
    val handleColor = tokens.dialHandleColor.color
    val trackColor = tokens.dialTrackColor.color
    val unit = session.unit
    val pending = session.pending

    // TMP-12: the numbers of each unit, measured once per style, density and locale.
    val measurer = rememberTextMeasurer()
    val style = tokens.dialLabelTypescale.toTextStyle()
    val numbers = remember(style, density, config.text, twelve) {
        fun ring(values: List<Int>, digits: Int, onInner: Boolean) = values.mapIndexed { index, value ->
            DialNumber(measurer.measure(config.text.number(value, digits), style, density = density), index * DEGREES_PER_HOUR, onInner)
        }
        val hours = if (twelve) {
            ring(listOf(HOURS_12) + (1 until HOURS_12), 1, onInner = false)
        } else {
            ring((0 until HOURS_12).toList(), 2, onInner = false) + ring((HOURS_12 until HOURS_PER_DAY).toList(), 2, onInner = true)
        }
        mapOf(
            TanreiTimePickerUnit.Hour to hours,
            TanreiTimePickerUnit.Minute to ring((0 until HOURS_12).map { it * MINUTE_PAGE }, 2, onInner = false),
        )
    }

    // TMP-15: the numbers cross-fade when the unit changes, over the dial motion (at once where motion is reduced).
    val transition = updateTransition(unit, label = "dial-unit")
    val hourAlpha by transition.animateFloat({ tanreiTween(tokens.motionDialDuration, tokens.motionDialEasing) }, label = "hours") { if (it == TanreiTimePickerUnit.Hour) 1f else 0f }
    val minuteAlpha by transition.animateFloat({ tanreiTween(tokens.motionDialDuration, tokens.motionDialEasing) }, label = "minutes") { if (it == TanreiTimePickerUnit.Minute) 1f else 0f }

    // TMP-13 / TMP-15: the handle — at the value while a press or a drag is on the dial, otherwise moving to it along the
    // shorter arc over the dial motion (a key, an action, a field or a change of unit).
    val target = tanreiDialPosition(unit, pending, twelve)
    val targetRadius = if (target.inner) inner else outer
    val angle = remember { Animatable(target.degrees) }
    val radius = remember { Animatable(targetRadius) }
    val dragging = session.dragging
    LaunchedEffect(target.degrees, targetRadius, dragging) {
        if (dragging) {
            angle.snapTo(target.degrees)
            radius.snapTo(targetRadius)
            return@LaunchedEffect
        }
        // The shorter arc: the difference taken between -180 and 180 degrees.
        val delta = ((target.degrees - angle.value) % FULL_TURN_F + FULL_TURN_F + HALF_TURN_DEGREES) % FULL_TURN_F - HALF_TURN_DEGREES
        val spec = tanreiTween<Float>(tokens.motionDialDuration, tokens.motionDialEasing)
        coroutineScope {
            launch { angle.animateTo(angle.value + delta, spec) }
            launch { radius.animateTo(targetRadius, spec) }
        }
    }
    val between = unit == TanreiTimePickerUnit.Minute && pending.minute % MINUTE_PAGE != 0
    val set by rememberUpdatedState(actions)

    Canvas(
        Modifier
            .size(tokens.dialContainerSize)
            // TMP-14 / TMP-26: a pointer surface, hidden from assistive technology.
            .clearAndSetSemantics {}
            .pointerInput(twelve, outer, inner) {
                awaitEachGesture {
                    val down = awaitFirstDown()
                    fun at(position: Offset) {
                        val current = set.session
                        set.dialSet(tanreiDialValue(position.x - size.width / 2f, position.y - size.height / 2f, current.unit, current.pending, set.twelve, outer, inner))
                    }
                    at(down.position)
                    down.consume()
                    try {
                        while (true) {
                            val event = awaitPointerEvent()
                            val change = event.changes.firstOrNull { it.id == down.id } ?: break
                            if (!change.pressed) {
                                change.consume()
                                break
                            }
                            at(change.position)
                            change.consume()
                        }
                    } finally {
                        set.dialReleased()
                    }
                }
            },
    ) {
        val center = Offset(size.width / 2, size.height / 2)
        drawCircle(face, radius = size.minDimension / 2, center = center)
        val handleDegrees = if (dragging) target.degrees else angle.value
        val handleRadius = if (dragging) targetRadius else radius.value
        val handle = pointOnDial(center, handleDegrees, handleRadius)
        fun numbers(color: Color) {
            for ((each, alpha) in listOf(TanreiTimePickerUnit.Hour to hourAlpha, TanreiTimePickerUnit.Minute to minuteAlpha)) {
                if (alpha <= 0f) continue
                for (number in numbers.getValue(each)) {
                    val at = pointOnDial(center, number.degrees, if (number.inner) inner else outer)
                    val layout = number.layout
                    drawText(layout, color = color, topLeft = Offset(at.x - layout.size.width / 2f, at.y - layout.size.height / 2f), alpha = alpha)
                }
            }
        }
        // The track and the centre dot under the numbers (an inner-ring number the track passes stays readable).
        drawLine(trackColor, center, handle, strokeWidth = tokens.dialTrackWidth.toPx())
        drawCircle(trackColor, radius = tokens.dialCenterSize.toPx() / 2, center = center)
        numbers(labelColor)
        drawCircle(handleColor, radius = handlePx / 2, center = handle)
        // The part of a number under the handle, in the selected label color.
        clipPath(Path().apply { addOval(Rect(handle, handlePx / 2)) }) { numbers(selectedColor) }
        if (between) drawCircle(selectedColor, radius = tokens.dialCenterSize.toPx() / 2, center = handle)
    }
}

/** A number on the dial: its measured text, its angle clockwise from the top, and whether it is on the inner ring. */
private class DialNumber(val layout: TextLayoutResult, val degrees: Float, val inner: Boolean)

/** The point [radius] from [center] at [degrees] clockwise from the top. */
private fun pointOnDial(center: Offset, degrees: Float, radius: Float): Offset {
    val radians = degrees * PI.toFloat() / HALF_TURN_DEGREES
    return Offset(center.x + radius * sin(radians), center.y - radius * cos(radians))
}

// ── Locale data (TMP-9, TMP-10, TMP-27) ──────────────────────────────────────

/**
 * The locale's time forms for the picker: the names of the periods ("AM", "PM"; "午前", "午後"), numbers in its digits,
 * the separator between hours and minutes, how many digits it writes an hour with, where its 12-hour pattern writes the
 * period (TMP-10) and its preferred clock (TMP-6) — read from the locale's best patterns for the skeletons `hm`, `Hm` and
 * `j` (`android.text.format.DateFormat.getBestDateTimePattern`), never from a list of locales.
 */
@Stable
internal class TanreiTimeText(val locale: Locale) {
    private val digits = TanreiDateText(locale)
    private val twelvePattern = fields(bestPattern("hm"))
    private val twentyFourPattern = fields(bestPattern("Hm"))
    private val preferred = fields(bestPattern("j"))

    /** The names of the periods, before and after noon. */
    val periodNames: List<String> = periodNames(locale)

    /** TMP-10: the locale's 12-hour pattern writes the period before the hour ("aK:mm" in ja), not after the minutes ("h:mm a"). */
    val periodBefore: Boolean = run {
        val period = twelvePattern.indexOfFirst { it.field && it.text[0] in PERIOD_FIELDS }
        val hour = twelvePattern.indexOfFirst { it.field && it.text[0] in HOUR_FIELDS }
        period >= 0 && hour >= 0 && period < hour
    }

    /** TMP-6: the locale's preferred clock is 12-hour (it counts 1 to 12 or 0 to 11). */
    val localeTwelve: Boolean = preferred.firstOrNull { it.field && it.text[0] in HOUR_FIELDS }?.text?.get(0).let { it == 'h' || it == 'K' }

    /** TMP-9: the literal between the hour and the minute of the 24-hour pattern (":" in most locales, "." in Finnish). */
    val separator: String = run {
        val hour = twentyFourPattern.indexOfFirst { it.field && it.text[0] in HOUR_FIELDS }
        val minute = twentyFourPattern.indexOfFirst { it.field && it.text[0] == 'm' }
        if (hour < 0 || minute <= hour) ":" else twentyFourPattern.subList(hour + 1, minute).filterNot { it.field }.joinToString("") { it.text }.trim().ifEmpty { ":" }
    }

    private fun hourDigits(pattern: List<PatternPart>): Int = pattern.firstOrNull { it.field && it.text[0] in HOUR_FIELDS }?.text?.length?.coerceIn(1, 2) ?: 1

    private val hourDigits12 = hourDigits(twelvePattern)
    private val hourDigits24 = hourDigits(twentyFourPattern)

    /** [value] in the locale's digits, at least [digits] of them. */
    fun number(value: Int, digits: Int = 1): String = this.digits.number(value, digits)

    /** TMP-9: a 24-hour [hour] as the locale writes an hour of the clock in use ("7" in en-US with h12, "07" with h23). */
    fun hourText(hour: Int, twelve: Boolean): String = if (twelve) number(tanreiShownHour12(hour), hourDigits12) else number(hour, hourDigits24)

    /** TMP-9: a minute with two digits. */
    fun minuteText(minute: Int): String = number(minute, 2)

    /** TMP-23: [text] as a whole number — ASCII or the locale's digits, nothing else (surrounding spaces aside); null otherwise. */
    fun wholeNumber(text: String): Int? {
        val trimmed = text.trim()
        if (trimmed.isEmpty() || trimmed.length > FIELD_MAX_LENGTH + 1) return null
        var value = 0
        for (char in trimmed) {
            val digit = Character.digit(char, 10)
            if (digit < 0) return null
            value = value * 10 + digit
        }
        return value
    }

    private fun bestPattern(skeleton: String): String = runCatching { android.text.format.DateFormat.getBestDateTimePattern(locale, skeleton) }.getOrDefault("")

    private companion object {
        val HOUR_FIELDS = setOf('h', 'H', 'k', 'K')
        val PERIOD_FIELDS = setOf('a', 'b', 'B')

        fun periodNames(locale: Locale): List<String> {
            val names = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                android.icu.text.DateFormatSymbols(android.icu.util.ULocale.forLocale(locale)).amPmStrings
            } else {
                java.text.DateFormatSymbols.getInstance(locale).amPmStrings
            }
            return listOf(names.getOrNull(0) ?: "AM", names.getOrNull(1) ?: "PM")
        }

        /** A date pattern's fields (runs of one letter) and literals (quoted text and everything else). */
        fun fields(pattern: String): List<PatternPart> {
            val parts = mutableListOf<PatternPart>()
            val literal = StringBuilder()
            fun flush() {
                if (literal.isNotEmpty()) parts += PatternPart(literal.toString(), field = false)
                literal.clear()
            }
            var index = 0
            while (index < pattern.length) {
                val char = pattern[index]
                when {
                    char == '\'' -> {
                        val close = pattern.indexOf('\'', index + 1).takeIf { it > index } ?: pattern.length
                        literal.append(if (close == index + 1) "'" else pattern.substring(index + 1, close))
                        index = close + 1
                        continue
                    }
                    char.isLetter() -> {
                        flush()
                        val start = index
                        while (index < pattern.length && pattern[index] == char) index++
                        parts += PatternPart(pattern.substring(start, index), field = true)
                        continue
                    }
                    else -> literal.append(char)
                }
                index++
            }
            flush()
            return parts
        }
    }
}

/** A part of a date pattern: a field ("h", "mm", "a") or literal text. */
internal data class PatternPart(val text: String, val field: Boolean)

// ── Constants: the clock's, not design values ────────────────────────────────

private const val MINUTES_PER_HOUR = 60
private const val HOURS_PER_DAY = 24
private const val HOURS_12 = 12
private const val MINUTE_PAGE = 5
private const val FULL_TURN = 360.0
private const val FULL_TURN_F = 360f
private const val HALF_TURN_DEGREES = 180
private const val DEGREES_PER_HOUR = 30f
private const val DEGREES_PER_MINUTE = 6f
private const val FIELD_MAX_LENGTH = 2
private val HH_MM = Regex("""(\d{2}):(\d{2})""")
private const val KEYBOARD_GLYPH = "keyboard"
private const val SCHEDULE_GLYPH = "schedule"

/** A selector and a period segment draw no shadow: they have no elevation tokens. */
private val NoShadow: List<TanreiShadowLayer> = emptyList()
