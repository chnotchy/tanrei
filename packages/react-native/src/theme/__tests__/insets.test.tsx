// TanreiProvider's `insets`: the window's system insets, which the package cannot read
// itself (it takes no safe-area dependency). What the overlay layer and the bars read.
import type { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { NO_INSETS, TanreiProvider, resolveInsets, useTanreiInsets, type TanreiInsets } from '../TanreiProvider';

function Probe({ own, seen }: { own?: TanreiInsets; seen: (insets: ReturnType<typeof useTanreiInsets>) => void }) {
  seen(useTanreiInsets(own));
  return null;
}

async function read(tree: (probe: ReactElement) => ReactElement, own?: TanreiInsets) {
  let last: ReturnType<typeof useTanreiInsets> | null = null;
  await render(tree(<Probe own={own} seen={(insets) => (last = insets)} />));
  return last!;
}

test('without a provider or insets every side is 0', async () => {
  expect(await read((probe) => probe)).toEqual(NO_INSETS);
  expect(await read((probe) => <TanreiProvider>{probe}</TanreiProvider>)).toEqual(NO_INSETS);
});

test('a provider\'s insets reach every component below it; a side it leaves out is 0; a negative or non-finite side counts as 0', async () => {
  expect(await read((probe) => <TanreiProvider insets={{ top: 47, bottom: 34 }}>{probe}</TanreiProvider>)).toEqual({ top: 47, right: 0, bottom: 34, left: 0 });
  expect(resolveInsets({ top: -3, left: Number.NaN, right: Infinity, bottom: 2 })).toEqual({ top: 0, right: 0, bottom: 2, left: 0 });
});

test('a nested provider without insets keeps the outer one\'s; one with insets replaces them', async () => {
  const outer = { top: 47, right: 0, bottom: 34, left: 0 };
  expect(await read((probe) => <TanreiProvider insets={outer}><TanreiProvider theme="dark">{probe}</TanreiProvider></TanreiProvider>)).toEqual(outer);
  expect(await read((probe) => <TanreiProvider insets={outer}><TanreiProvider insets={{ left: 20 }}>{probe}</TanreiProvider></TanreiProvider>)).toEqual({ top: 0, right: 0, bottom: 0, left: 20 });
});

test('a component\'s own insets replace the provider\'s side by side (a bar that is not at the top passes top: 0)', async () => {
  expect(await read((probe) => <TanreiProvider insets={{ top: 47, right: 12, bottom: 34, left: 20 }}>{probe}</TanreiProvider>, { top: 0 })).toEqual({ top: 0, right: 12, bottom: 34, left: 20 });
});
