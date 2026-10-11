// LoadingIndicator as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props
// become a <LoadingIndicator>, and which props select a token axis (`size`).
import { defineSubject } from '../../testing/harness';
import { LoadingIndicator, type LoadingIndicatorProps } from '../LoadingIndicator';

export const loadingIndicatorSubject = defineSubject<LoadingIndicatorProps>({
  component: 'LoadingIndicator',
  spec: 'loading-indicator',
  tokens: 'loadingIndicator',
  render: (props) => <LoadingIndicator {...props} />,
  axes: { size: 'sizes' },
});
