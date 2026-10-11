// TimePicker as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// time picker. TMP-1's verify and the spec's React Native notes: `TimePickerSurface` drawn in place on the fixture's
// stage — 480 × 640 of the surface color (720 × 480 for the horizontal layout), its scrim over it and its container
// centred (a `Modal` is a native window the snapshot does not include). `visible` (the spec's open) is the Modal's.
import { defineSubject } from '../../testing/harness';
import { TimePickerSurface, type TimePickerProps } from '../TimePicker';
import { SheetStage } from './BottomSheet.subject';

type SubjectProps = Omit<TimePickerProps, 'layout'> & { layout?: string };

export const timePickerSubject = defineSubject<SubjectProps>({
  component: 'TimePicker',
  spec: 'time-picker',
  tokens: 'timePicker',
  render: ({ visible: _visible, insets: _insets, layout, ...props }) => (
    <SheetStage width={layout === 'horizontal' ? 720 : 480} height={layout === 'horizontal' ? 480 : 640}>
      <TimePickerSurface {...props} layout={layout as TimePickerProps['layout']} />
    </SheetStage>
  ),
  // The conditions are a token axis no prop names: the dial's unit and the pending period pick one.
  axes: {},
});
