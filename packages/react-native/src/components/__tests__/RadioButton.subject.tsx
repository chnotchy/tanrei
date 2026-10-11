// RadioButton as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props become
// a <RadioButton>. The spec's `name` maps to `RadioGroup` (React Native forms a group with a `RadioGroup` parent), so a
// fixture's option is rendered inside a group named by it. Its conditions are a token axis that no prop names —
// `selected` picks one — so `axes` is empty.
import { defineSubject } from '../../testing/harness';
import { RadioButton, RadioGroup, type RadioButtonProps } from '../RadioButton';

export type RadioButtonFixtureProps = RadioButtonProps & { RadioGroup?: string };

export const radioButtonSubject = defineSubject<RadioButtonFixtureProps>({
  component: 'RadioButton',
  spec: 'radio-button',
  tokens: 'radioButton',
  render: ({ RadioGroup: group, ...props }) => (
    <RadioGroup accessibilityLabel={group}>
      <RadioButton {...props} />
    </RadioGroup>
  ),
  axes: {},
});
