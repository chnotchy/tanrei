// SegmentedButton as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture
// becomes a <SegmentedButton>. A fixture's items arrive under their React Native names
// (`platforms.react-native.items.segment`) with their `kind`, which a `Segment` drops. SEG-14's verify: the set at its
// natural width, start-aligned in a 400-wide stage.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { SegmentedButton, type Segment, type SegmentedButtonProps } from '../SegmentedButton';

type FixtureSegment = Segment & { kind?: string };
type SubjectProps = Omit<SegmentedButtonProps, 'items' | 'size' | 'selectionMode'> & { items?: FixtureSegment[]; size?: string; selectionMode?: string; values?: readonly string[]; value?: string | null };

/** A fixture item as a `Segment`: its `kind` dropped. */
export const segmentOf = ({ kind: _kind, ...segment }: FixtureSegment): Segment => segment;

export const segmentedButtonSubject = defineSubject<SubjectProps>({
  component: 'SegmentedButton',
  spec: 'segmented-button',
  tokens: 'segmentedButton',
  render: ({ items = [], ...props }) => (
    <View style={{ width: 400, alignItems: 'flex-start' }}>
      <SegmentedButton {...(props as SegmentedButtonProps)} items={items.map(segmentOf)} />
    </View>
  ),
  axes: { size: 'sizes' },
});
