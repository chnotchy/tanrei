// Divider as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props become a
// <Divider>. It has no token axis — orientation and inset are drawn by code — so `axes` is empty.
import { defineSubject } from '../../testing/harness';
import { Divider, type DividerProps } from '../Divider';

export const dividerSubject = defineSubject<DividerProps>({
  component: 'Divider',
  spec: 'divider',
  tokens: 'divider',
  render: (props) => <Divider {...props} />,
  axes: {},
});
