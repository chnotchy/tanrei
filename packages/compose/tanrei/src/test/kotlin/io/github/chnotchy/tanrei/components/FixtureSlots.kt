package io.github.chnotchy.tanrei.components

import androidx.compose.runtime.Composable
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import java.io.File
import org.json.JSONArray
import org.json.JSONObject

/**
 * What a fixture puts into a named slot, by the slot's `fixture` kind — `glyph` (the icon helper's stand-in,
 * [NamedFixtureGlyph]), `icon-only-button` (a standard medium Tanrei icon button showing the glyph, labelled by its name),
 * `button` (a Tanrei Button of the text variant with that label) or `text` (plain text in the slot's inherited style).
 */
internal class FixtureSlot(val kind: String, val values: List<String>)

/** The slots [fixture] fills, with the kind the spec [spec] (its parsed JSON) declares for each. A slot the spec does not let fixtures fill fails. */
internal fun fixtureSlots(spec: JSONObject, fixture: JSONObject): Map<String, FixtureSlot> {
    val declared = spec.optJSONArray("slots")?.let { slots -> (0 until slots.length()).map(slots::getJSONObject) }.orEmpty()
        .associate { it.getString("name") to it.optString("fixture").takeIf { kind -> kind.isNotEmpty() } }
    val given = fixture.optJSONObject("slots") ?: return emptyMap()
    return given.keys().asSequence().associateWith { name ->
        val kind = requireNotNull(declared[name]) { "fixture ${fixture.getString("id")} fills slot \"$name\", which no fixture may fill" }
        val values = when (val value = given.get(name)) {
            is JSONArray -> (0 until value.length()).map(value::getString)
            else -> listOf(value as String)
        }
        require(values.size == 1 || kind == "icon-only-button" || kind == "button") { "slot \"$name\" (a $kind) takes one string" }
        FixtureSlot(kind, values)
    }
}

/** The spec file at [path], parsed. */
internal fun readSpec(path: String): JSONObject = JSONObject(File(path).readText())

/** [slot] rendered by its fixture kind; [onClick] is wired to the buttons it makes. Null for no slot. */
internal fun fixtureSlotContent(slot: FixtureSlot?, onClick: () -> Unit = {}): (@Composable () -> Unit)? = slot?.let {
    {
        for (value in slot.values) {
            when (slot.kind) {
                "glyph" -> NamedFixtureGlyph(value)
                "icon-only-button" -> TanreiIconButton(onClick = onClick, contentDescription = value, variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) { NamedFixtureGlyph(value) }
                "button" -> TanreiButton(text = value, onClick = onClick, variant = TanreiButtonVariant.Text)
                "text" -> TanreiText(value)
                else -> error("unknown slot kind ${slot.kind}")
            }
        }
    }
}
