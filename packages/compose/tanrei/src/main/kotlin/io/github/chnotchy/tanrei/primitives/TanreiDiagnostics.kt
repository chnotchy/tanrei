package io.github.chnotchy.tanrei.primitives

import android.content.pm.ApplicationInfo
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import java.util.concurrent.ConcurrentHashMap

/**
 * Where Tanrei reports what an app should fix but a user must never pay for — a component value or a step of a
 * series the active design system does not have. Reports are made in debuggable apps only; a release build
 * renders the fallback silently.
 */
public object TanreiDiagnostics {
    private const val TAG = "Tanrei"

    /** The default [reporter]: a warning in Logcat. */
    public val LogWarning: (String) -> Unit = { message -> Log.w(TAG, message) }

    /** Receives every report. Replace it to route reports into your own logging, or to fail fast in tests. */
    @Volatile
    public var reporter: (String) -> Unit = LogWarning

    /**
     * Whether the app is debuggable. Generated accessors are plain properties with no `Context` to ask, so
     * `TanreiTheme` records it here when it enters the composition; before any theme has, nothing is reported.
     */
    @Volatile
    internal var debuggable: Boolean = false

    private val reported: MutableSet<String> = ConcurrentHashMap.newKeySet()

    /**
     * What a generated accessor for a step a design system ADDED to a series (`space.space1200`,
     * `typescale.…`, `motion.standardSpring.…`) calls when the system it is read from does not have the step.
     * It never throws: it answers with [fallback] — the value the system [declaredBy] gave the step, which the
     * generator wrote into the accessor — and, in a debuggable app, reports the step once. The same spirit as a
     * component given a size its system does not have.
     */
    public fun <T> missingStep(series: String, key: String, declaredBy: String, fallback: () -> T): T {
        if (debuggable && reported.add("step:$series/$key")) {
            reporter("$series.$key: the design system this was read from has no step \"$key\" (\"$declaredBy\" declares it); using the value of \"$declaredBy\" instead.")
        }
        return fallback()
    }

    /**
     * What the generated `TanreiColors.get` calls when a [scheme] has no color [role] (a component token naming a
     * palette the active system never declared): the lookup has already fallen back to the matching slot of the
     * `primary` palette ([fallback]), and a debuggable app reports the role once per scheme — the same
     * report SwiftUI, Flutter and React Native make. `TanreiTheme` runs the check ahead of time
     * (`TanreiSystem.unknownRoles`); this catches a color resolved outside a theme, or a role that check does not see.
     */
    public fun missingRole(scheme: String, role: String, fallback: String) {
        if (debuggable && reported.add("role:$scheme/$role")) {
            reporter("colors.$scheme: the design system has no color role \"$role\"; using \"$fallback\" instead.")
        }
    }

    /**
     * A value outside what a spec accepts, met outside composition (a progress read in the draw or effect phase,
     * PRG-11): the component has already clamped it ([instead]); a debuggable app hears about it once per component,
     * prop and value. The composable counterpart is `TanreiReportInvalidValue`.
     */
    internal fun invalidValue(component: String, prop: String, value: String, problem: String, instead: String) {
        if (debuggable && reported.add("value:$component/$prop/$value/$problem")) {
            reporter("$component: $prop $value $problem; drawing it $instead.")
        }
    }

    /**
     * A problem a component finds outside composition (in its layout: a button group whose row does not fit, BGR-7, or
     * that holds foreign content, BGR-10): a debuggable app hears [message] once per [key].
     */
    internal fun report(key: String, message: String) {
        if (debuggable && reported.add("problem:$key")) reporter(message)
    }

    /** Tests only: report every missing step and role again. */
    internal fun forgetReportedSteps() {
        reported.clear()
    }
}

/** Whether the app that hosts this composition is debuggable. Also tells [TanreiDiagnostics], for code outside composition. */
@Composable
internal fun isTanreiDebuggable(): Boolean {
    val debuggable = (LocalContext.current.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
    TanreiDiagnostics.debuggable = debuggable
    return debuggable
}

/**
 * Debuggable apps only: reports, once per composition site and value, that [component] was given a [prop]
 * value the design system [system] does not have. The component has already fallen back to the default
 * value's tokens; nothing is reported, and nothing else happens, in a release build.
 */
@Composable
internal fun TanreiReportUnknownValue(system: String, component: String, prop: String, key: String) {
    if (!isTanreiDebuggable()) return
    remember(system, component, prop, key) {
        TanreiDiagnostics.reporter("$component: the design system \"$system\" has no $prop \"$key\"; drawing the default $prop instead.")
    }
}

/**
 * Debuggable apps only: reports, once per composition site, that [component] was given no accessible name in [prop]
 * (spec `XXX-n` "WHILE label is empty … SHALL still render, and in debug builds report that it has no accessible
 * name"). [what] says what is drawn without one ("an icon alone" …). The component still renders and still works;
 * assistive technology announces it without a name. Nothing is reported in a release build.
 */
@Composable
internal fun TanreiReportMissingName(component: String, prop: String, what: String = "an icon alone") {
    if (!isTanreiDebuggable()) return
    remember(component, prop, what) {
        TanreiDiagnostics.reporter("$component: $prop is empty — $what is not an accessible name; assistive technology announces it without one.")
    }
}

/**
 * Debuggable apps only: reports, once per composition site and value, that [component] was given a [prop] value
 * outside what the spec accepts ([value], described by [problem]: "is negative", "is below 1" …) and is drawn
 * [instead] ("as 0", "with its default of 999" …). The component has already fallen back; nothing is reported, and
 * nothing else happens, in a release build. (Spec behaviours such as BDG-14 and PRG-11.)
 */
@Composable
internal fun TanreiReportInvalidValue(component: String, prop: String, value: String, problem: String, instead: String) {
    if (!isTanreiDebuggable()) return
    remember(component, prop, value, problem) {
        TanreiDiagnostics.reporter("$component: $prop $value $problem; drawing it $instead.")
    }
}
