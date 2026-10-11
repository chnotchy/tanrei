// SplitButton as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// <SplitButton>. SPB-12's verify: the split button at its natural width, start-aligned on a 320-wide stage; an `open`
// fixture shows the trailing half's open form and presents no menu (a fixture cannot fill the menu slot).
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { SplitButton, type SplitButtonProps } from '../SplitButton';

type SubjectProps = Omit<SplitButtonProps, 'variant' | 'size'> & { variant?: string; size?: string };

export const splitButtonSubject = defineSubject<SubjectProps>({
  component: 'SplitButton',
  spec: 'split-button',
  tokens: 'splitButton',
  render: (props) => (
    <View style={{ width: 320, alignItems: 'flex-start' }}>
      <SplitButton {...(props as SplitButtonProps)} />
    </View>
  ),
  axes: { variant: 'variants', size: 'sizes' },
});
