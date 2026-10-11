// IconButton as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props become an
// <IconButton>, and which props select a token axis. The fixtures' `content` ("favorite") becomes `children`: a glyph
// of the system's icon font.
//
// `axes` is written by hand: one line per component, and
// `describeSharedVocabulary` fails at once when a holder name is wrong, so a generated map would buy little.
import { defineSubject } from '../../testing/harness';
import { IconButton, type IconButtonProps } from '../IconButton';

export const iconButtonSubject = defineSubject<IconButtonProps>({
  component: 'IconButton',
  spec: 'icon-button',
  tokens: 'iconButton',
  render: (props) => <IconButton {...props} />,
  axes: { size: 'sizes', variant: 'variants' },
});
