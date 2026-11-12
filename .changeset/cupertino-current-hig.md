---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
---

**cupertino follows Apple's current Human Interface Guidelines** (read 2026-11-12). Its fidelity to Apple's published figures rises from 38 of 52 to 50 of 52.

- **Colors.** `primary`, `error`, `success`, `warning` and `info` are Apple's system Blue, Red, Green, Orange and Cyan as Apple has published them since its June 2025 color update, in light and dark: primary is #0088ff / #0091ff (was #087aff / #4c8eff), error #ff383c / #ff4245, success #34c759 / #30d158, warning #ff8d28 / #ff9230, info #00c0e8 / #3cd3fe. The medium and high contrast schemes take Apple's increased-contrast swatches (Apple publishes one increased contrast): primary #1e6ef4 / #5cb8ff, error #e9152d / #ff6165, success #008932 / #4ad968, warning #c55300 / #ffa056, info #007eae / #6dd9ff. The containers and the other tones of these palettes follow the new seeds. Text in these colors and white text on them contrast less than before (cupertino's accessibility report lists 226 measurements, was 113), as on Apple's platforms; an imitation preset is held to fidelity, so none of them is an error.
- **Type.** `display` and `heading-1` to `heading-3` are Regular (400), as Apple's Large Title and Title 1 to 3 are (were 700, 700, 700, 600). The display and heading emphasis steps are 300 (were 100 and 200), so emphasized display, heading-1 and heading-2 are Bold (700) as Apple's are (were 800, 900, 900). One step serves the heading family, so emphasized heading-3 is 700 and heading-4 900 where Apple's emphasized Title 3 and Headline are Semibold (600); the fidelity map lists both. cupertino's large app-bar title, which aliases `display`, is now Regular where Apple's large navigation title is Bold: a component text style cannot take its role's emphasized weight yet (mimicry gap `emphasis-per-style`).
- **The fidelity harness** compares a color in every scheme a map names (`colors.schemes`, Tanrei scheme to the reference's appearance), and the Apple reference records the increased-contrast swatches.
- **A model read one scheme at a time** (the MCP server) now reports the snackbar's expand and close glyph in every scheme, as a whole model does; it reported the light scheme only.

No snapshot baseline moves: every cupertino snapshot stays within the comparison tolerance of its baseline with these values.
