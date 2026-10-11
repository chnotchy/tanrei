// Button as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props become a
// <Button>, and which props select a token axis.
import { defineSubject } from '../../testing/harness';
import { Button, type ButtonProps } from '../Button';

export const buttonSubject = defineSubject<ButtonProps>({
  component: 'Button',
  spec: 'button',
  tokens: 'button',
  render: (props) => <Button {...props} />,
  axes: { size: 'sizes', variant: 'variants' },
});
