import { useCallback, useState } from 'react';
import type { Insets, LayoutChangeEvent } from 'react-native';
import { useTanrei } from '../theme/TanreiProvider';

export interface VisualSize {
  width: number;
  height: number;
}

/**
 * `hitSlop` that extends a view of the given visual size to `target` (a `system.measure.target` value)
 * on both axes.
 */
export function minimumTargetHitSlop(size: VisualSize, target: number): Insets {
  const horizontal = Math.max(0, Math.ceil((target - size.width) / 2));
  const vertical = Math.max(0, Math.ceil((target - size.height) / 2));
  return { top: vertical, bottom: vertical, left: horizontal, right: horizontal };
}

/**
 * Tracks the host's laid-out size and returns the `hitSlop` that meets the minimum target without
 * changing the visual size. `estimate` is used until the first layout pass. React Native cannot tell
 * touch from fine-pointer input, so the system's touch target is used.
 */
export function useMinimumTarget(estimate: VisualSize) {
  const target = useTanrei().system.measure.target.touch;
  const [measured, setMeasured] = useState<VisualSize | null>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMeasured((previous) => (previous && previous.width === width && previous.height === height ? previous : { width, height }));
  }, []);
  const size = measured ?? estimate;
  // `measured` is null until the first layout pass.
  return { hitSlop: minimumTargetHitSlop(size, target), onLayout, measured };
}
