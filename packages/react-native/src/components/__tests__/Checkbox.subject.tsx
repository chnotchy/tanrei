// Checkbox as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props become a
// <Checkbox>. Its conditions are a token axis (`conditions`) that no prop names — three booleans pick one (CHK-4) — so
// `axes` is empty; the conditions' vocabulary is checked in Checkbox.presets.test.tsx.
import { defineSubject } from '../../testing/harness';
import { Checkbox, type CheckboxProps } from '../Checkbox';

export const checkboxSubject = defineSubject<CheckboxProps>({
  component: 'Checkbox',
  spec: 'checkbox',
  tokens: 'checkbox',
  render: (props) => <Checkbox {...props} />,
  axes: {},
});
