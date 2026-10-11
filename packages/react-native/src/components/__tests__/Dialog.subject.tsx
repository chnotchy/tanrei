// Dialog as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// dialog. The spec's React Native notes: `DialogSurface` (the surface and the scrim) in place in a 480 × 640 view —
// a `Modal` is a native window the snapshot does not include. A fixture's `content` is the custom content.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { DialogSurface, type DialogProps } from '../Dialog';

type SubjectProps = Omit<DialogProps, 'headline'> & { headline?: string };

export const dialogSubject = defineSubject<SubjectProps>({
  component: 'Dialog',
  spec: 'dialog',
  tokens: 'dialog',
  // `visible` (the spec's open) is the Modal's: the surface is drawn as it is while open.
  render: ({ visible: _visible, initialFocusRef: _focus, headline = '', ...props }) => (
    <View style={{ width: 480, height: 640 }}>
      <DialogSurface {...props} headline={headline} />
    </View>
  ),
  axes: {},
});
