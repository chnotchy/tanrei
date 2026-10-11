// FloatingActionButton as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props
// become a <FloatingActionButton>. The fixtures' `content` ("add") arrives as `children` and becomes the `icon` prop — a
// glyph of the system's icon font (the spec's `platforms.react-native` notes).
import { defineSubject } from '../../testing/harness';
import { FloatingActionButton, type FloatingActionButtonProps } from '../Fab';

type SubjectProps = FloatingActionButtonProps & { children?: string };

export const fabSubject = defineSubject<SubjectProps>({
  component: 'Fab',
  spec: 'fab',
  tokens: 'fab',
  render: ({ children, ...props }) => <FloatingActionButton icon={children} {...props} />,
  axes: { size: 'sizes', variant: 'variants' },
});
