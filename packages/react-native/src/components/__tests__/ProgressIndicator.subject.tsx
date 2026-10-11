// ProgressIndicator as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props
// become a <ProgressIndicator>, and which props select a token axis (`size`; `variant` is drawn by code).
import { defineSubject } from '../../testing/harness';
import { ProgressIndicator, type ProgressIndicatorProps } from '../ProgressIndicator';

export const progressIndicatorSubject = defineSubject<ProgressIndicatorProps>({
  component: 'ProgressIndicator',
  spec: 'progress-indicator',
  tokens: 'progressIndicator',
  render: (props) => <ProgressIndicator {...props} />,
  axes: { size: 'sizes' },
});
