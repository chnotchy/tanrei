package io.github.chnotchy.tanrei.primitives

import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEvent
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.isAltPressed
import androidx.compose.ui.input.key.isCtrlPressed
import androidx.compose.ui.input.key.isMetaPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.key.utf16CodePoint
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.LayoutDirection

/** How long typed characters keep adding to one type-ahead search (LST-15, MNU-7: "within one second of each other"). */
private const val TYPEAHEAD_PAUSE_MILLIS = 1000L

/**
 * The repeated items of one list or menu, as the keyboard and assistive technology see them: their order,
 * their count, which one is the Tab stop, and moving focus among them with the arrow keys, Home, End and type-ahead
 * (list LST-15, menu MNU-7). The component that holds the items owns one ([rememberTanreiRovingFocus]); each item
 * registers an [Entry] ([rememberTanreiRovingEntry]) and puts [tanreiRovingItem] on its input node; the holder puts
 * [tanreiRovingKeys] on its own node, around the items.
 *
 * Items are ordered by where they are laid out (top to bottom), so an item added in the middle takes its place; the
 * order of registration breaks a tie (before the first layout, every item is at 0).
 *
 * [wrap]: Down Arrow on the last item goes to the first and Up Arrow on the first to the last (a menu), or stays (a list).
 * [allFocusable]: every focusable item is a Tab stop of its own — a menu, whose items are reached from inside it; a list
 * is ONE Tab stop, [tabStop].
 * [horizontal]: the items are a ROW (tabs, TAB-12): they are ordered from the start edge, Right and Left Arrow move to
 * the next and previous item — mirrored while [layoutDirection] is right-to-left — and Up and Down are not used.
 * [typeahead]: printable characters search the items' text (a list, a menu); tabs have no type-ahead.
 * [tabStopIsSelected]: the Tab stop is always the selected enabled item (tabs, whose selection follows focus), never
 * the item that had focus last.
 * [crossAxisKeys]: in a [horizontal] row, Down Arrow also moves to the next item and Up Arrow to the previous one, in
 * either layout direction (a segmented button, SEG-18, SEG-19 — as a radio group); tabs leave them to the page.
 */
@Stable
internal class TanreiRovingFocus(
    private val wrap: Boolean,
    private val allFocusable: Boolean = false,
    internal val horizontal: Boolean = false,
    private val typeahead: Boolean = true,
    private val tabStopIsSelected: Boolean = false,
    private val crossAxisKeys: Boolean = false,
) {
    /** One item. Its fields are set by its item after each composition ([rememberTanreiRovingEntry]). */
    @Stable
    internal class Entry(internal val serial: Int) {
        val focusRequester = FocusRequester()

        /** Where it was laid out last, in the root's coordinates. */
        internal var top by mutableFloatStateOf(0f)

        /** Takes keyboard focus: an interactive item or an option (disabled too — the arrow keys reach it). */
        var focusable by mutableStateOf(false)
        var enabled by mutableStateOf(true)
        var selected by mutableStateOf(false)

        /** What type-ahead matches: the headline or label. */
        var text by mutableStateOf("")

        /** An option's value, for the holder's reports (LST-26). */
        var value by mutableStateOf("")
        var option by mutableStateOf(false)
    }

    private var serials = 0
    private val entries = mutableStateListOf<Entry>()

    /** The holder's layout direction, for a [horizontal] row: set by the holder in each composition. */
    internal var layoutDirection: LayoutDirection = LayoutDirection.Ltr

    /**
     * Called after the arrow keys, Home or End moved focus to an item (not after type-ahead or a pointer): tabs select
     * the tab focus reached (automatic activation, TAB-12).
     */
    internal var onMove: ((Entry) -> Unit)? = null

    /** Every item, in reading order. */
    val ordered: List<Entry> by derivedStateOf { entries.sortedWith(compareBy<Entry>({ it.top }, { it.serial })) }

    /** The item that had keyboard focus last, while it is still one of these items. */
    private var lastFocused: Entry? by mutableStateOf(null)

    /** The item that has focus now; null when focus is elsewhere. Read by the key handler, never drawn. */
    internal var focused: Entry? = null
        private set

    private var typed = ""
    private var typedAt = Long.MIN_VALUE

    internal fun newEntry(): Entry = Entry(serials++)

    internal fun register(entry: Entry) {
        entries += entry
    }

    internal fun unregister(entry: Entry) {
        entries -= entry
        if (lastFocused === entry) lastFocused = null
        if (focused === entry) focused = null
    }

    /** The item's position, from 0; -1 before it has registered. */
    fun indexOf(entry: Entry): Int = ordered.indexOf(entry)

    val size: Int get() = ordered.size

    /**
     * The one item Tab reaches (LST-15): the item that had focus last, else the first selected option, else the first
     * enabled item; null when no item takes focus.
     */
    fun tabStop(): Entry? {
        val candidates = ordered.filter { it.focusable }
        if (tabStopIsSelected) return candidates.firstOrNull { it.selected && it.enabled } ?: candidates.firstOrNull { it.enabled }
        lastFocused?.let { if (it in candidates) return it }
        return candidates.firstOrNull { it.selected && it.enabled } ?: candidates.firstOrNull { it.enabled }
    }

    /** Whether [entry] may take focus now: every focusable item of a menu; only the Tab stop of a list. */
    internal fun canFocus(entry: Entry): Boolean = entry.focusable && (allFocusable || tabStop() === entry || focused === entry || requested === entry)

    /** The item [focus] is moving focus to, while it does: it may take focus before it has become the Tab stop. */
    private var requested: Entry? = null

    internal fun focusChanged(entry: Entry, focused: Boolean) {
        if (focused) {
            this.focused = entry
            lastFocused = entry
        } else if (this.focused === entry) {
            this.focused = null
        }
    }

    /** Moves keyboard focus to [entry]; true when it took it. */
    fun focus(entry: Entry): Boolean {
        lastFocused = entry
        requested = entry
        try {
            return entry.focusRequester.requestFocus()
        } finally {
            requested = null
        }
    }

    /** The first item that takes focus and is enabled (a menu opening, MNU-1); null when there is none. */
    fun firstEnabled(): Entry? = ordered.firstOrNull { it.focusable && it.enabled }

    /** The arrow keys, Home, End and type-ahead, while an item has focus. True when the key was used. */
    internal fun onKey(event: KeyEvent): Boolean {
        val current = focused ?: return false
        if (event.type != KeyEventType.KeyDown) return false
        val items = ordered.filter { it.focusable }
        val here = items.indexOf(current)
        if (here < 0 || items.isEmpty()) return false
        val next = { items.getOrNull(here + 1) ?: if (wrap) items.first() else current }
        val previous = { items.getOrNull(here - 1) ?: if (wrap) items.last() else current }
        val rtl = layoutDirection == LayoutDirection.Rtl
        val target = when {
            event.key == Key.MoveHome -> items.first()
            event.key == Key.MoveEnd -> items.last()
            !horizontal && event.key == Key.DirectionDown -> next()
            !horizontal && event.key == Key.DirectionUp -> previous()
            horizontal && event.key == Key.DirectionRight -> if (rtl) previous() else next()
            horizontal && event.key == Key.DirectionLeft -> if (rtl) next() else previous()
            horizontal && crossAxisKeys && event.key == Key.DirectionDown -> next()
            horizontal && crossAxisKeys && event.key == Key.DirectionUp -> previous()
            typeahead -> return typeahead(event, items, here)
            else -> return false
        }
        if (target !== current && focus(target)) onMove?.invoke(target)
        return true
    }

    /**
     * Printable characters typed within [TYPEAHEAD_PAUSE_MILLIS] of each other are one search: focus moves to the next
     * item whose text begins with them (ignoring case), the search starting after the focused item for a first character
     * and at it for the next ones, so that typing on refines the match. Space is left to activation.
     */
    private fun typeahead(event: KeyEvent, items: List<Entry>, here: Int): Boolean {
        if (event.isCtrlPressed || event.isAltPressed || event.isMetaPressed) return false
        val code = event.utf16CodePoint
        if (code <= ' '.code || Character.isISOControl(code)) return false
        val time = event.nativeKeyEvent.eventTime
        val first = typed.isEmpty() || time - typedAt > TYPEAHEAD_PAUSE_MILLIS
        typed = (if (first) "" else typed) + String(Character.toChars(code))
        typedAt = time
        val start = if (first) here + 1 else here
        val match = (items.indices).map { items[(start + it) % items.size] }.firstOrNull { it.text.startsWith(typed, ignoreCase = true) }
        if (match != null && match !== items[here]) focus(match)
        return true
    }
}

/** One [TanreiRovingFocus] for the lifetime of the holder. */
@Composable
internal fun rememberTanreiRovingFocus(wrap: Boolean, allFocusable: Boolean = false): TanreiRovingFocus =
    remember(wrap, allFocusable) { TanreiRovingFocus(wrap, allFocusable) }

/**
 * Registers one item with [roving] (null: the item is outside any holder) for as long as it is in the composition, and
 * tells it, after each composition, whether it takes focus, is enabled and selected, what type-ahead matches, and its
 * option value.
 */
@Composable
internal fun rememberTanreiRovingEntry(
    roving: TanreiRovingFocus?,
    focusable: Boolean,
    enabled: Boolean,
    selected: Boolean,
    text: String,
    value: String = "",
    option: Boolean = false,
): TanreiRovingFocus.Entry? {
    if (roving == null) return null
    val entry = remember(roving) { roving.newEntry() }
    DisposableEffect(roving, entry) {
        roving.register(entry)
        onDispose { roving.unregister(entry) }
    }
    SideEffect {
        entry.focusable = focusable
        entry.enabled = enabled
        entry.selected = selected
        entry.text = text
        entry.value = value
        entry.option = option
    }
    return entry
}

/**
 * The item's side: where it is laid out (its order: from the top, or for a [TanreiRovingFocus.horizontal] row from the
 * start edge), and — while it takes focus ([focusable]) — its focus requester, whether it may be
 * focused ([TanreiRovingFocus.canFocus]) and telling the holder when it gains or loses focus. Goes BEFORE the item's
 * input modifier (`clickable`, `focusable` …): focus properties apply to the focus target that follows them.
 */
internal fun Modifier.tanreiRovingItem(roving: TanreiRovingFocus?, entry: TanreiRovingFocus.Entry?, focusable: Boolean): Modifier {
    if (roving == null || entry == null) return this
    val placed = onPlaced { coordinates ->
        val position = coordinates.positionInRoot()
        entry.top = when {
            !roving.horizontal -> position.y
            roving.layoutDirection == LayoutDirection.Rtl -> -(position.x + coordinates.size.width)
            else -> position.x
        }
    }
    // Focus properties reach the focus targets of child layout nodes too: a static item must not set them, or the
    // product's control in its trailing slot would lose its own focus stop (LST-11).
    if (!focusable) return placed
    return placed
        .focusRequester(entry.focusRequester)
        .focusProperties { canFocus = roving.canFocus(entry) }
        .onFocusChanged { roving.focusChanged(entry, it.isFocused) }
}

/** The holder's side: the arrow keys, Home, End and type-ahead that reach it from a focused item, which did not use them. */
internal fun Modifier.tanreiRovingKeys(roving: TanreiRovingFocus): Modifier = onKeyEvent { roving.onKey(it) }

/*
 * A holder whose items are OTHER components — a toolbar's Tanrei Buttons and icon buttons (TBR-10) — reaches them through
 * this internal channel, as a button group reaches its items through `LocalTanreiJoinedRow`. Not part of any public
 * surface: outside such a holder it is null, and a Tanrei button registers nowhere and is its own Tab stop as always.
 */

/** A holder's roving focus, offered to the Tanrei buttons composed in its content, in the window ([view]) it is in. */
@Immutable
internal class TanreiRovingGroup(val roving: TanreiRovingFocus, val view: View)

/** The holder a Tanrei button is an item of; null outside one (and inside an item's own content). */
internal val LocalTanreiRovingGroup: ProvidableCompositionLocal<TanreiRovingGroup?> = staticCompositionLocalOf { null }

/** Offers [roving] to the Tanrei buttons [content] composes. */
@Composable
internal fun ProvideTanreiRovingGroup(roving: TanreiRovingFocus, content: @Composable () -> Unit) {
    val view = LocalView.current
    val group = remember(roving, view) { TanreiRovingGroup(roving, view) }
    CompositionLocalProvider(LocalTanreiRovingGroup provides group, content = content)
}

/** The content of an item — its label or icon — is not itself an item of the holder. */
@Composable
internal fun WithoutTanreiRovingGroup(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalTanreiRovingGroup provides null, content = content)
}

/**
 * The roving focus of the holder this Tanrei button is an item of; null outside one. A button composed into another
 * window from inside the holder's content — a dialog's or a menu's, opened from it — is not one of its items.
 */
@Composable
internal fun currentTanreiRovingGroup(): TanreiRovingFocus? {
    val group = LocalTanreiRovingGroup.current ?: return null
    return if (group.view === LocalView.current) group.roving else null
}
