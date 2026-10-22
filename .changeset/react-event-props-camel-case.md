---
'@tanrei/react': minor
---

**Breaking — React event props.** Every event prop is now `on` and the event's name in camel case, as React names its
own (`onKeyDown`): 22 props that took the DOM event's lowercase name are renamed. The elements still fire their events
in lowercase (`expandedchange`), as the platform's own events are named, so a listener added with `addEventListener`
is unchanged.

| Was | Is |
|---|---|
| `onAttachmentschange` | `onAttachmentsChange` |
| `onContextrequest` | `onContextRequest` |
| `onControlshiddenchange` | `onControlsHiddenChange` |
| `onCopyfailed` | `onCopyFailed` |
| `onCurrentchange` | `onCurrentChange` |
| `onDetentchange` | `onDetentChange` |
| `onEntryerror` | `onEntryError` |
| `onExpandedchange` | `onExpandedChange` |
| `onIndexchange` | `onIndexChange` |
| `onLoaderror` | `onLoadError` |
| `onNavigationopenchange` | `onNavigationOpenChange` |
| `onPausedchange` | `onPausedChange` |
| `onPickerrequest` | `onPickerRequest` |
| `onPresentationchange` | `onPresentationChange` |
| `onResizeend` | `onResizeEnd` |
| `onResizestart` | `onResizeStart` |
| `onRowschange` | `onRowsChange` |
| `onSelectionchange` | `onSelectionChange` |
| `onSendablechange` | `onSendableChange` |
| `onSendblocked` | `onSendBlocked` |
| `onWindowclasschange` | `onWindowClassChange` |
| `onZoomchange` | `onZoomChange` |

The old names are not kept as deprecated aliases: the package has had only a prerelease, and an alias would add a
second listener for the same event and a second name to every editor's completions. TypeScript reports an old name as
a prop the wrapper does not have; JavaScript reports nothing, so search a project for the names on the left.

The copy button's and the code block's failure event is named `copyFailed` in their specs, as every other event is
named in camel case; the web event is still `copyfailed`, and the native callbacks are still `onCopyFailed`.
