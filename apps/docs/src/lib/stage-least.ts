// The least width a stage of the fixtures' gallery is laid out at, in CSS pixels: its width handle makes it no narrower,
// and a stage that stands for an area of a window is laid out at no less (lib/fixture-stages.ts, lib/stage-area.ts).
// Its own module, so that the gallery's build and its script in the browser read the same number.
export const LEAST = 160;
