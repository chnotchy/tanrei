// Search as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// <Search>. A fixture's items are the `suggestions` (their `kind` dropped); its filled slots arrive as `leading` and
// `trailing` (standard IconButtons showing the glyph and named by it). The stages are the spec's: bar fixtures
// draw the bar 328 wide, centered in a 360 × 72 stage (SRC-1); the docked fixture the bar 328 wide at the top of a
// 360 × 320 stage, 16 from its top and sides, with the open view in place below it (SRC-7); the full-screen fixture the
// open view in place in a 360 × 480 stage that stands for the window (SRC-9). An open view is drawn with `inline`.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { Search, type SearchProps, type SearchSuggestion } from '../Search';

type FixtureSuggestion = SearchSuggestion & { kind?: string };
type SubjectProps = Omit<SearchProps, 'presentation' | 'suggestions'> & { presentation?: string; items?: FixtureSuggestion[] };

/** A fixture item as a `SearchSuggestion`: its `kind` dropped. */
export const suggestionOf = ({ kind: _kind, ...suggestion }: FixtureSuggestion): SearchSuggestion => suggestion;

/** The spec's stage of a fixture. */
export function searchStage(props: { presentation?: string; expanded?: boolean }) {
  if (props.presentation === 'full-screen' && props.expanded) return { width: 360, height: 480 } as const;
  if (props.expanded) return { width: 360, height: 320, paddingTop: 16, paddingHorizontal: 16 } as const;
  return { width: 360, height: 72, justifyContent: 'center', paddingHorizontal: 16 } as const;
}

export const searchSubject = defineSubject<SubjectProps>({
  component: 'Search',
  spec: 'search',
  tokens: 'search',
  render: ({ items = [], ...props }) => (
    <View style={searchStage(props)}>
      <Search {...(props as SearchProps)} suggestions={items.map(suggestionOf)} inline style={props.presentation === 'full-screen' && props.expanded ? { flex: 1 } : undefined} />
    </View>
  ),
  axes: {},
});
