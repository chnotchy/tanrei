// Badge as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props become a
// <Badge>. The fixtures' `content` ("notifications") becomes `children`: the anchor, a glyph of the system's icon font.
// The badge has no token axis, so `axes` is empty.
import { defineSubject } from '../../testing/harness';
import { Badge, type BadgeProps } from '../Badge';

export const badgeSubject = defineSubject<BadgeProps>({
  component: 'Badge',
  spec: 'badge',
  tokens: 'badge',
  render: (props) => <Badge {...props} />,
  axes: {},
});
