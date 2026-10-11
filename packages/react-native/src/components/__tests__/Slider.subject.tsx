// Slider as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// <Slider>. SLD-7's verify: a horizontal slider 320 long, centered in a 320 × 96 stage (room above the handle for a
// value indicator); the vertical one 240 long, centered in a 96 × 240 stage.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { Slider, type SliderProps } from '../Slider';

type SubjectProps = Omit<SliderProps, 'size' | 'orientation' | 'valueIndicator'> & { size?: string; orientation?: string; valueIndicator?: string };

/** The spec's stage of an orientation. */
export const sliderStage = (orientation: string | undefined) =>
  orientation === 'vertical' ? ({ width: 96, height: 240, alignItems: 'center' } as const) : ({ width: 320, height: 96, justifyContent: 'center' } as const);

export const sliderSubject = defineSubject<SubjectProps>({
  component: 'Slider',
  spec: 'slider',
  tokens: 'slider',
  render: (props) => (
    <View style={sliderStage(props.orientation)}>
      <Slider {...(props as SliderProps)} />
    </View>
  ),
  axes: { size: 'sizes' },
});
