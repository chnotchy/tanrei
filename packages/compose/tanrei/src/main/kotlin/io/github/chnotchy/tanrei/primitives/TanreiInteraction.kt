package io.github.chnotchy.tanrei.primitives

import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.pointerInput
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * The one interaction state a component draws. Exactly one wins: disabled, then
 * pressed > focused > hovered. [focused] means keyboard focus — focus gained by pointer or touch
 * never selects the focused state.
 */
internal fun tanreiInteractionStateOf(
    pressed: Boolean,
    focused: Boolean,
    hovered: Boolean,
    enabled: Boolean = true,
): TanreiInteractionState = when {
    !enabled -> TanreiInteractionState.Disabled
    pressed -> TanreiInteractionState.Pressed
    focused -> TanreiInteractionState.Focused
    hovered -> TanreiInteractionState.Hovered
    else -> TanreiInteractionState.Enabled
}

/**
 * A press as a component draws it: [pressed] turns true with the press and stays true for at least the
 * design system's `duration.press-hold`, because a tap or a key press ends within a frame.
 *
 * A press is heard from TWO places, and counted once:
 * - the pointer itself, through [tanreiPressInput] — touch-down shows the press on the next frame EVERYWHERE, also
 *   inside a scrolling container, where foundation's `clickable` holds its `PressInteraction` back for the tap
 *   timeout to tell a tap from a scroll (spec `XXX-n` "SHALL show the pressed state without delay"). When the gesture
 *   becomes a scroll the press is cancelled — what the web (`pointercancel`) and iOS do;
 * - the [InteractionSource], for Enter / Space, accessibility clicks and a caller that drives a hoisted source.
 *   The `PressInteraction` that `clickable` emits for a pointer press that was already heard is the same press.
 */
@Stable
internal class TanreiPress {
    /** True from the press until it has ended AND has been visible for the hold time. */
    var pressed: Boolean by mutableStateOf(false)
        private set

    /**
     * Where the latest press started, in the coordinates of the input modifier (`clickable` and [tanreiPressInput]
     * sit on the same node): the point of contact for pointer and touch, [Offset.Unspecified] for Enter / Space —
     * draw those from the center.
     *
     * `clickable` reports a key press at the center of its bounds only once a pointer event has told it its bounds;
     * a control that has only ever been used by keyboard reports [Offset.Zero] (foundation 1.12). Zero is therefore
     * read as "no point of contact": the very corner of the touch target is outside every container anyway.
     */
    var origin: Offset by mutableStateOf(Offset.Unspecified)
        private set

    /** Counts presses, so an effect can restart for each one. 0 = never pressed. */
    var generation: Int by mutableIntStateOf(0)
        private set

    /** Set by [collectTanreiPress]: the composition's scope (its frame clock counts the hold) and the hold time. */
    internal var scope: CoroutineScope? = null
    internal var holdMillis: Int = 0

    private val interactions = mutableListOf<PressInteraction.Press>()
    private var pointerDown = false

    /** The position of a pointer press `clickable` has not reported yet; its `PressInteraction` is that same press. */
    private var unclaimed: Offset? = null
    private var hold: Job? = null

    /** The pointer went down at [position]. */
    fun pointerPressed(position: Offset) {
        pointerDown = true
        unclaimed = position
        begin(position)
    }

    /** The pointer went up, or — [cancelled] — the gesture became something else (a scroll, a drag out of bounds). */
    fun pointerReleased(cancelled: Boolean) {
        pointerDown = false
        // After a cancel `clickable` reports nothing more for this gesture: whatever press comes next is a new one.
        if (cancelled) unclaimed = null
        ended()
    }

    fun interactionPressed(interaction: PressInteraction.Press) {
        interactions += interaction
        val heard = unclaimed
        unclaimed = null
        if (heard != null && heard == interaction.pressPosition) return // the pointer press, reported again (late, inside a scrolling container)
        begin(interaction.pressPosition.takeUnless { it == Offset.Zero } ?: Offset.Unspecified)
    }

    fun interactionEnded(interaction: PressInteraction.Press) {
        interactions -= interaction
        ended()
    }

    private val active: Boolean get() = pointerDown || interactions.isNotEmpty()

    private fun begin(at: Offset) {
        origin = at
        generation++
        pressed = true
        hold?.cancel()
        hold = scope?.launch {
            val start = withFrameMillis { it }
            while (withFrameMillis { it } - start < holdMillis) {
                // Wait for the next frame.
            }
            hold = null
            if (!active) pressed = false
        }
    }

    private fun ended() {
        if (!active && hold == null) pressed = false
    }
}

/**
 * Observes the presses of [this] and keeps each one visible for at least [holdMillis] (spec `XXX-n` "SHALL keep it
 * visible for at least sys.motion.duration.press-hold"). The hold is counted in frames of the composition's clock,
 * so it follows the clock of a test as well. Pointer presses reach the same [TanreiPress] through [tanreiPressInput].
 */
@Composable
internal fun InteractionSource.collectTanreiPress(holdMillis: Int = TanreiTheme.tokens.motion.duration.pressHold): TanreiPress {
    val press = remember(this) { TanreiPress() }
    press.scope = rememberCoroutineScope()
    press.holdMillis = holdMillis
    LaunchedEffect(this, press) {
        interactions.collect { interaction ->
            when (interaction) {
                is PressInteraction.Press -> press.interactionPressed(interaction)
                is PressInteraction.Release -> press.interactionEnded(interaction.press)
                is PressInteraction.Cancel -> press.interactionEnded(interaction.press)
            }
        }
    }
    return press
}

/**
 * Tells [press] about pointer presses the moment they start. Goes RIGHT AFTER `clickable` in the chain — the same
 * node, so the same bounds (the touch target) and coordinates, and inside it, so it sees the down before `clickable`
 * consumes it. It consumes nothing: clicking, scrolling and every other gesture work as without it. The gesture ends
 * as `clickable`'s own does (`waitForUpOrCancellation`): pointer up, or cancelled once a parent consumes the movement
 * (a scroll began) or the pointer leaves the bounds.
 */
internal fun Modifier.tanreiPressInput(press: TanreiPress, enabled: Boolean = true): Modifier =
    if (!enabled) this else pointerInput(press) {
        awaitEachGesture {
            val down = awaitFirstDown()
            press.pointerPressed(down.position)
            var cancelled = true
            try {
                cancelled = waitForUpOrCancellation() == null
            } finally {
                // Also when the modifier leaves mid-gesture (the button got disabled): the press must not stick.
                press.pointerReleased(cancelled)
            }
        }
    }

/** What [collectTanreiInteraction] resolved. */
@Stable
internal class TanreiInteraction(
    /** The state whose tokens the component draws: disabled, else pressed (held) > keyboard-focused > hovered. */
    val state: TanreiInteractionState,
    /** [state] as it would be without the press: what lies under a pressed layer that grows, dims or is not drawn. */
    val unpressed: TanreiInteractionState,
    val press: TanreiPress,
)

/**
 * Which state's tokens each part of a component draws, once the system's `pressed-feedback` has had its
 * say. The pressed tokens say WHAT a press looks like; the feedback says how it arrives:
 * - [content] — label, outline, elevation, opacity, shape: the pressed tokens, unless the system does not answer a
 *   press at all (`none`), where they stay with the state under the press;
 * - [container] — the container color: the pressed one at once under `overlay`; under `ripple` (the pressed color
 *   grows over it, [rememberTanreiRipple]), `dim` (no state layer) and `none` it stays with the state under the press.
 */
@Immutable
internal data class TanreiDrawnStates(val content: TanreiInteractionState, val container: TanreiInteractionState)

/** The pure rule of [TanreiDrawnStates]: [state] as resolved, [unpressed] the same without the press. */
internal fun tanreiDrawnStatesOf(state: TanreiInteractionState, unpressed: TanreiInteractionState, feedback: TanreiPressedFeedback): TanreiDrawnStates {
    val pressed = state == TanreiInteractionState.Pressed
    return TanreiDrawnStates(
        content = if (pressed && feedback == TanreiPressedFeedback.None) unpressed else state,
        container = if (pressed && feedback != TanreiPressedFeedback.Overlay) unpressed else state,
    )
}

/** [tanreiDrawnStatesOf] for this interaction under the system's [feedback]. */
internal fun TanreiInteraction.drawnStates(feedback: TanreiPressedFeedback): TanreiDrawnStates = tanreiDrawnStatesOf(state, unpressed, feedback)

/**
 * Observes [this] and reduces it to the one state whose tokens the component draws from. How that
 * state looks is decided by the design system's values, never by the component.
 */
@Composable
internal fun InteractionSource.collectTanreiInteraction(enabled: Boolean = true): TanreiInteraction {
    val press = collectTanreiPress()
    val hovered by collectIsHoveredAsState()
    val focused = isTanreiKeyboardFocused()
    return TanreiInteraction(
        state = tanreiInteractionStateOf(pressed = press.pressed, focused = focused, hovered = hovered, enabled = enabled),
        unpressed = tanreiInteractionStateOf(pressed = false, focused = focused, hovered = hovered, enabled = enabled),
        press = press,
    )
}

/** The state of [collectTanreiInteraction] alone. */
@Composable
internal fun InteractionSource.collectTanreiInteractionState(enabled: Boolean = true): TanreiInteractionState =
    collectTanreiInteraction(enabled).state
