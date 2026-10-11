// Snackbar as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// <Snackbar>. The spec's React Native notes: `Snackbar` rendered in place (SNK-19) in a 400-wide view.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { Snackbar, type SnackbarProps } from '../Snackbar';

type SubjectProps = Omit<SnackbarProps, 'duration' | 'message'> & { duration?: string; message?: string };

export const snackbarSubject = defineSubject<SubjectProps>({
  component: 'Snackbar',
  spec: 'snackbar',
  tokens: 'snackbar',
  render: ({ message = '', ...props }) => (
    <View style={{ width: 400 }}>
      <Snackbar {...(props as Omit<SnackbarProps, 'message'>)} message={message} />
    </View>
  ),
  // The controls are a token axis no prop names: the action and the close button each read their own.
  axes: {},
});
