import { createContext, useContext, type ReactNode } from 'react';

// React Native has no inherited text color: a `<Text>` never takes its color from the view around it. A container that
// hands its content a foreground (a card's `content.color`, CRD-13) provides it here instead, and whatever draws text
// or icons inside reads it with `useContentColor()`.

const ContentColorContext = createContext<string | undefined>(undefined);

/**
 * The foreground color the nearest Tanrei container hands its content — a `Card`'s content color in its variant and
 * current state, in the active scheme — or `undefined` outside any such container. It is the settled color of the
 * state the container is in: it changes at once when the state changes, while the container's own drawing moves over
 * its motion tokens.
 */
export function useContentColor(): string | undefined {
  return useContext(ContentColorContext);
}

/** Provides `color` to everything below (package-internal: containers use it, products read `useContentColor`). */
export function ContentColorProvider({ color, children }: { color: string; children?: ReactNode }) {
  return <ContentColorContext.Provider value={color}>{children}</ContentColorContext.Provider>;
}
