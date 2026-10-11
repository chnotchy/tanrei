// Card as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props become a
// <Card>. The spec's `interactive` is React Native's `onPress` (a card is interactive when it has a handler), so a
// fixture's `interactive: true` arrives here as `onPress: true` and becomes a handler that does nothing.
import { defineSubject } from '../../testing/harness';
import { Card, type CardProps } from '../Card';

type SubjectProps = Omit<CardProps, 'onPress'> & { onPress?: CardProps['onPress'] | boolean };

const noop = () => undefined;

export const cardSubject = defineSubject<SubjectProps>({
  component: 'Card',
  spec: 'card',
  tokens: 'card',
  render: ({ onPress, ...props }) => <Card {...props} onPress={typeof onPress === 'boolean' ? (onPress ? noop : undefined) : onPress} />,
  axes: { variant: 'variants' },
});
