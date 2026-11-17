// The tags of the two elements a field that opens a list of options holds (src/components/option/), in a module of
// their own: the elements define themselves by them and draw nothing, so their bundle imports this and not
// src/primitives/option-list.ts, whose list the field renders with Lit directives that a bundler keeps wherever the
// module is imported (`directive()` is not marked pure), used or not.

/** The option's element: one choice. Data for its field. */
export const OPTION_TAG = 'tanrei-option';
/** The group's element: a run of options under an optional title. */
export const OPTION_GROUP_TAG = 'tanrei-option-group';
