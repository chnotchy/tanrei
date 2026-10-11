// BottomSheet as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// bottom sheet. The spec's React Native notes: `BottomSheetSurface` (the sheet and, for a modal sheet, the scrim) in
// place in a 400 × 720 view over a `surface` page — a `Modal` is a native window the snapshot does not include. `open`
// is the Modal's: the surface is drawn as it rests open. A fixture's `content` is the sheet's content (a string).
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { useTanrei } from '../../theme/TanreiProvider';
import { BottomSheetSurface, type BottomSheetProps } from '../BottomSheet';

type SubjectProps = Omit<BottomSheetProps, 'variant' | 'detent'> & { variant?: string; detent?: string };

/** The spec's stage: 400 × 720 on the `surface` role (the page the sheet covers). */
export function SheetStage({ width = 400, height = 720, children }: { width?: number; height?: number; children?: ReactNode }) {
  const theme = useTanrei();
  return <View style={{ width, height, backgroundColor: theme.color('surface') }}>{children}</View>;
}

export const bottomSheetSubject = defineSubject<SubjectProps>({
  component: 'BottomSheet',
  spec: 'bottom-sheet',
  tokens: 'bottomSheet',
  render: ({ open: _open, initialFocusRef: _focus, ...props }) => (
    <SheetStage>
      <BottomSheetSurface {...(props as BottomSheetProps)} />
    </SheetStage>
  ),
  axes: {},
});
