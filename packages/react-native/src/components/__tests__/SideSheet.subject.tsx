// SideSheet as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// side sheet. The spec's React Native notes: `SideSheetSurface` in place in a 720 × 480 view over a `surface` page — a
// standard sheet at the end of a row (the content beside it takes the rest), a modal one with its scrim over the stage
// and its panel at the end (a `Modal` is a native window the snapshot does not include). `open` is the Modal's and the
// row's: the surface is drawn as it rests open. The fixture's actions are text Buttons.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { SideSheetSurface, type SideSheetProps } from '../SideSheet';
import { SheetStage } from './BottomSheet.subject';

type SubjectProps = Omit<SideSheetProps, 'variant'> & { variant?: string };

export const sideSheetSubject = defineSubject<SubjectProps>({
  component: 'SideSheet',
  spec: 'side-sheet',
  tokens: 'sideSheet',
  render: ({ open: _open, initialFocusRef: _focus, variant, ...props }) => (
    <SheetStage width={720} height={480}>
      {variant === 'modal' ? (
        <SideSheetSurface {...props} variant="modal" />
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }} />
          <SideSheetSurface {...props} variant={variant as SideSheetProps['variant']} />
        </View>
      )}
    </SheetStage>
  ),
  axes: { variant: 'variants' },
});
