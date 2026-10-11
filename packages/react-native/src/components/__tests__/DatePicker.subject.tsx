// DatePicker as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// date picker. DTP-1's verify and the spec's React Native notes: `DatePickerSurface` drawn in place on the fixture's
// stage — a modal picker on a 480 × 640 stage of the surface color with its scrim over it and its container centred (a
// `Modal` is a native window the snapshot does not include), a docked picker at its natural size centred on a 400 × 440
// stage of the surface color, without an anchor, placement or open motion. `visible` (the spec's open) is the Modal's
// and the overlay's: the surface is drawn as it is while open.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { DatePickerSurface, type DatePickerProps } from '../DatePicker';
import { SheetStage } from './BottomSheet.subject';

type SubjectProps = Omit<DatePickerProps, 'presentation'> & { presentation?: string };

export const datePickerSubject = defineSubject<SubjectProps>({
  component: 'DatePicker',
  spec: 'date-picker',
  tokens: 'datePicker',
  render: ({ visible: _visible, anchorRef: _anchor, insets: _insets, presentation, ...props }) =>
    presentation === 'docked' ? (
      <SheetStage width={400} height={440}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <DatePickerSurface {...props} presentation="docked" />
        </View>
      </SheetStage>
    ) : (
      <SheetStage width={480} height={640}>
        <DatePickerSurface {...props} presentation={presentation as DatePickerProps['presentation']} />
      </SheetStage>
    ),
  // The conditions are a token axis no prop names: a day's date and the choice pick one.
  axes: {},
});
