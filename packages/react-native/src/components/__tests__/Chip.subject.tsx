// Chip as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props become a
// <Chip>. A fixture's `content` arrives as `children`: "avatar" is the `avatar` prop (the neutral fixture image), any
// other content is the `icon` prop — a glyph of the system's icon font (the spec's `platforms.react-native` notes).
import { defineSubject } from '../../testing/harness';
import { Chip, type ChipProps } from '../Chip';
import { FIXTURE_AVATAR } from './__fixtures__/avatar';

type SubjectProps = ChipProps & { children?: string };

export const chipSubject = defineSubject<SubjectProps>({
  component: 'Chip',
  spec: 'chip',
  tokens: 'chip',
  render: ({ children, ...props }) => (children === 'avatar' ? <Chip avatar={FIXTURE_AVATAR} {...props} /> : <Chip icon={children} {...props} />),
  axes: { size: 'sizes', variant: 'variants' },
});
