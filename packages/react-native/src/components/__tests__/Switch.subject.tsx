// Switch as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props become a
// <Switch>. Its conditions are a token axis that no prop names — `selected` (`value`) picks one — so `axes` is empty.
import { defineSubject } from '../../testing/harness';
import { Switch, type SwitchProps } from '../Switch';

export const switchSubject = defineSubject<SwitchProps>({
  component: 'Switch',
  spec: 'switch',
  tokens: 'switch',
  render: (props) => <Switch {...props} />,
  axes: {},
});
