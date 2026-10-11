// The fixture gallery: every fixture of every implemented component's spec (the registration table in
// `registry.tsx`), under every shipped system, with theme and contrast switches. It is what a person opens on a simulator to LOOK at the component; the same
// component is rendered by a Jest test and type-checked in CI, so it cannot rot unnoticed.
import { useState, type ReactNode } from 'react';
import { ScrollView, StatusBar, Text, View } from 'react-native';
import { Button, TanreiProvider, tanrei, useTanrei, type TanreiContrast, type TanreiSystem, type TanreiThemePreference } from '@tanrei/react-native';
import { cupertino } from '@tanrei/react-native/systems/cupertino';
import { m3ExpressiveLike } from '@tanrei/react-native/systems/m3-expressive-like';
import { m3Like } from '@tanrei/react-native/systems/m3-like';
import { COMPONENTS, renderFixture } from './registry';

/** Every system the package ships. A test fails when `src/generated/systems/` has one this list lacks. */
export const SYSTEMS: readonly TanreiSystem[] = [tanrei, m3Like, m3ExpressiveLike, cupertino];
export const THEMES: readonly TanreiThemePreference[] = ['system', 'light', 'dark'];
export const CONTRASTS: readonly TanreiContrast[] = ['standard', 'medium', 'high'];


function Choice<Value extends string>({ name, values, value, onChange }: { name: string; values: readonly Value[]; value: Value; onChange: (next: Value) => void }) {
  const { system, color, text } = useTanrei();
  return (
    <View style={{ gap: system.space.space50 }}>
      <Text style={[text('labelSmall'), { color: color('onSurfaceVariant') }]}>{name}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: system.space.space100 }}>
        {values.map((each) => (
          <Button key={each} testID={`gallery.${name}.${each}`} size="small" variant={each === value ? 'tonal' : 'outlined'} accessibilityState={{ selected: each === value }} onPress={() => onChange(each)}>
            {each}
          </Button>
        ))}
      </View>
    </View>
  );
}

function Surface({ children }: { children: ReactNode }) {
  const { system, scheme, color, text } = useTanrei();
  return (
    // Seen on the first real run (iPhone simulator): without this the title sat under the status bar. iOS insets the
    // scroll content itself; Android reports the bar's height (`StatusBar.currentHeight`, undefined on iOS).
    <ScrollView
      testID="gallery"
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color('surface'), paddingTop: StatusBar.currentHeight }}
      contentContainerStyle={{ padding: system.space.space300, gap: system.space.space300 }}>
      <Text testID="gallery.title" style={[text('heading4'), { color: color('onSurface') }]}>{`Tanrei — ${system.id} · ${scheme}`}</Text>
      {children}
    </ScrollView>
  );
}

function Fixtures() {
  const { system, color, text } = useTanrei();
  return (
    <View style={{ gap: system.space.space400 }}>
      {Object.entries(COMPONENTS).map(([component, { spec }]) => (
        <View key={component} testID={`gallery.component.${component}`} style={{ gap: system.space.space200 }}>
          <Text style={[text('heading5'), { color: color('onSurface') }]}>{spec.title}</Text>
          {spec.fixtures.map((fixture) => (
            <View key={fixture.id} style={{ gap: system.space.space50 }}>
              <Text style={[text('caption'), { color: color('onSurfaceVariant') }]}>{fixture.id}</Text>
              {renderFixture(component, fixture)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function GalleryScreen() {
  const [systemId, setSystemId] = useState<string>(tanrei.id);
  const [theme, setTheme] = useState<TanreiThemePreference>('system');
  const [contrast, setContrast] = useState<TanreiContrast>('standard');
  const system = SYSTEMS.find((each) => each.id === systemId) ?? tanrei;
  return (
    <TanreiProvider system={system} theme={theme} contrast={contrast}>
      <Surface>
        <Choice name="system" values={SYSTEMS.map((each) => each.id)} value={system.id} onChange={setSystemId} />
        <Choice name="theme" values={THEMES} value={theme} onChange={setTheme} />
        <Choice name="contrast" values={CONTRASTS} value={contrast} onChange={setContrast} />
        <Fixtures />
      </Surface>
    </TanreiProvider>
  );
}
