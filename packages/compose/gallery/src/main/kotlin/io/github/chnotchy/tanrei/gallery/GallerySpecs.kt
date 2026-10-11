package io.github.chnotchy.tanrei.gallery

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * One fixture of a component spec, as the spec states it: its [props] under the SPEC's names (not the Compose
 * ones — mapping them is the registry's job, `GalleryComponents`), every prop the fixture leaves out filled with the
 * spec's `default`, and its text [content] if it has one.
 */
data class GalleryFixture(
    val component: String,
    val id: String,
    val props: Map<String, Any>,
    val content: String?,
    /** The fixture's repeated items, in order; empty for a component without item kinds. */
    val items: List<GalleryItem> = emptyList(),
    /** The named slots the fixture fills, each with the kind its spec declares. */
    val slots: Map<String, GallerySlot> = emptyMap(),
) {
    /** A string prop (an enum value is the key of its token axis). Fails loudly when the spec gives none. */
    fun string(name: String): String = props[name] as? String ?: error("$component/$id: no string prop '$name' (props: $props)")

    /** A boolean prop. Fails loudly when the spec gives none. */
    fun boolean(name: String): Boolean = props[name] as? Boolean ?: error("$component/$id: no boolean prop '$name' (props: $props)")
}

/**
 * What a fixture puts into one named slot: the slot's [kind] as the spec declares it — `glyph`, `icon-button`,
 * `button` or `text` — and the fixture's strings for it, in order.
 */
data class GallerySlot(val kind: String, val values: List<String>)

/**
 * One item of a fixture: its [kind] (an item kind of the spec), its [props] under the SPEC's names with
 * the kind's defaults filled in, its text [content] if it has one, and — for a group kind — its own [items].
 */
data class GalleryItem(
    val kind: String,
    val props: Map<String, Any>,
    val content: String?,
    val items: List<GalleryItem>,
) {
    /** A string prop. Fails loudly when the kind gives none. */
    fun string(name: String): String = props[name] as? String ?: error("$kind: no string prop '$name' (props: $props)")

    /** A string prop whose default is null. */
    fun stringOrNull(name: String): String? = props[name] as? String

    /** A boolean prop. Fails loudly when the kind gives none. */
    fun boolean(name: String): Boolean = props[name] as? Boolean ?: error("$kind: no boolean prop '$name' (props: $props)")

    /** A number prop. Fails loudly when the kind gives none. */
    fun int(name: String): Int = (props[name] as? Number)?.toInt() ?: error("$kind: no number prop '$name' (props: $props)")
}

/** One component spec (`specs/<name>.spec.json`) as the gallery reads it: its prop names and its fixtures. */
data class GallerySpec(
    val name: String,
    val title: String,
    val props: Set<String>,
    val fixtures: List<GalleryFixture>,
)

/** Where the build puts the specs (`gallery/build.gradle.kts`, `copyComponentSpecs`). */
private const val SpecAssets = "specs"

/**
 * Every component spec of `specs/`, read at runtime: the build packages each `*.spec.json` as an asset, so the gallery
 * can never show a fixture list of its own invention. Sorted by name.
 */
fun loadGallerySpecs(context: Context): List<GallerySpec> =
    context.assets.list(SpecAssets).orEmpty()
        .filter { it.endsWith(".spec.json") }
        .sorted()
        .map { file -> parseGallerySpec(context.assets.open("$SpecAssets/$file").bufferedReader().use { it.readText() }) }

/** The spec named [name] (`specs/<name>.spec.json`). */
fun loadGallerySpec(context: Context, name: String): GallerySpec =
    loadGallerySpecs(context).firstOrNull { it.name == name } ?: error("no spec '$name' among the gallery's assets")

/** One spec's JSON → [GallerySpec]. A fixture naming a prop the spec does not declare fails here. */
fun parseGallerySpec(json: String): GallerySpec {
    val spec = JSONObject(json)
    val name = spec.getString("name")
    val declared = spec.optJSONArray("props")?.objects().orEmpty()
    val defaults = declared.filter { it.has("default") }.associate { it.getString("name") to it.get("default").toKotlin() }
    val propNames = declared.map { it.getString("name") }.toSet()
    // Slots a fixture may fill, by name → kind.
    val slotKinds = spec.optJSONArray("slots")?.objects().orEmpty()
        .mapNotNull { slot -> slot.optString("fixture").takeIf { it.isNotEmpty() }?.let { slot.getString("name") to it } }.toMap()
    // Item kinds: each kind's prop defaults, and its prop names, to check a fixture's items against.
    val kinds = spec.optJSONArray("items")?.objects().orEmpty().associate { kind ->
        val props = kind.optJSONArray("props")?.objects().orEmpty()
        kind.getString("name") to props.filter { it.has("default") }.associate { it.getString("name") to it.get("default").toKotlin() }.let { defaultsOf ->
            defaultsOf to props.map { it.getString("name") }.toSet()
        }
    }
    fun parseItems(where: String, items: JSONArray?): List<GalleryItem> = items?.objects().orEmpty().map { item ->
        val kind = item.getString("kind")
        val (kindDefaults, kindProps) = kinds[kind] ?: error("$where: an item has kind '$kind', which the spec does not declare")
        val given = item.optJSONObject("props") ?: JSONObject()
        val props = given.keys().asSequence().associateWith { given.get(it).toKotlin() }
        val unknown = props.keys - kindProps
        require(unknown.isEmpty()) { "$where: an item of kind '$kind' uses props its kind does not declare: $unknown" }
        GalleryItem(kind = kind, props = kindDefaults + props, content = item.optString("content").takeIf { item.has("content") }, items = parseItems(where, item.optJSONArray("items")))
    }
    val fixtures = spec.optJSONArray("fixtures")?.objects().orEmpty().map { fixture ->
        val id = fixture.getString("id")
        val given = fixture.optJSONObject("props") ?: JSONObject()
        val props = given.keys().asSequence().associateWith { given.get(it).toKotlin() }
        val unknown = props.keys - propNames
        require(unknown.isEmpty()) { "$name/$id: the fixture uses props its spec does not declare: $unknown" }
        GalleryFixture(
            component = name,
            id = id,
            props = defaults + props,
            content = fixture.optString("content").takeIf { fixture.has("content") },
            items = parseItems("$name/$id", fixture.optJSONArray("items")),
            slots = fixture.optJSONObject("slots")?.let { slots ->
                slots.keys().asSequence().associateWith { slot ->
                    val kind = slotKinds[slot] ?: error("$name/$id: the fixture fills slot '$slot', which no fixture may fill")
                    val value = slots.get(slot)
                    GallerySlot(kind, if (value is JSONArray) (0 until value.length()).map(value::getString) else listOf(value as String))
                }
            }.orEmpty(),
        )
    }
    return GallerySpec(name = name, title = spec.optString("title", name), props = propNames, fixtures = fixtures)
}

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

private fun Any.toKotlin(): Any = when (this) {
    is JSONObject -> keys().asSequence().associateWith { get(it).toKotlin() }
    is JSONArray -> (0 until length()).map { get(it).toKotlin() }
    else -> this
}
