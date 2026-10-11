// Tooltip as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// <Tooltip>. The spec's React Native notes: the anchor and the open tooltip in a fixed 320 × 200 view — the anchor an
// icon button holding the fixture's glyph (`content`), the tooltip drawn in place beside it (`inline`).
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { IconButton } from '../IconButton';
import { Tooltip, type TooltipProps } from '../Tooltip';

type SubjectProps = Omit<TooltipProps, 'children' | 'variant' | 'placement' | 'text'> & { children?: string; variant?: string; placement?: string; text?: string };

export const tooltipSubject = defineSubject<SubjectProps>({
  component: 'Tooltip',
  spec: 'tooltip',
  tokens: 'tooltip',
  render: ({ children = '', text = '', ...props }) => (
    <View style={{ width: 320, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Tooltip {...(props as Omit<TooltipProps, 'children' | 'text'>)} text={text} inline>
        <IconButton accessibilityLabel={children}>{children}</IconButton>
      </Tooltip>
    </View>
  ),
  // Plain and rich are a structural choice, not a token axis.
  axes: {},
});
