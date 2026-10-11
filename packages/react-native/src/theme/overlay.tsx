import { Fragment, createContext, useContext, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { View } from 'react-native';

// The overlay layer: a view above the app's content, below nothing, that NON-MODAL overlays
// render into — a tooltip, a snackbar, a menu (operated, but not modal). React Native's `Modal` is a window of its own: it takes every touch and moves
// accessibility focus, which a read overlay must not do. The layer is a sibling drawn
// after the provider's children, `pointerEvents="box-none"`: it draws on top and takes no touch of its own.
//
// It exists only while something is in it, so a tree without an overlay renders exactly as it
// would without the layer (every render baseline stays still). `TanreiProvider` hosts the outermost layer; a nested provider shares it; a `Modal`
// (a dialog) hosts its own, so a tooltip inside the dialog is drawn above the dialog and its scrim.

/**
 * How overlays in one layer stack: a snackbar under a menu (which a person opened over it), both under a tooltip
 * (TIP-13: a tooltip is above every other layer).
 */
export type OverlayLevel = 'snackbar' | 'menu' | 'tooltip';
const LEVELS: readonly OverlayLevel[] = ['snackbar', 'menu', 'tooltip'];

/** The layer's host view: what a placed overlay measures its window offset from. */
export type OverlayLayerNode = ComponentRef<typeof View>;

interface Entry {
  id: number;
  level: OverlayLevel;
  node: ReactNode;
}

interface OverlayHost {
  set: (id: number, level: OverlayLevel, node: ReactNode) => void;
  remove: (id: number) => void;
  /** The layer's view, once it is drawn. */
  layer: RefObject<OverlayLayerNode | null>;
  /** The one-at-a-time queue of this layer (a snackbar host). */
  queue: OverlayQueue;
  /** A modal dialog opened (+1) or closed (-1) over this layer's content. */
  cover: (delta: 1 | -1) => void;
}

/**
 * What a queued overlay's drawing receives (SNK-12): whether the host asked it to close (the product closed it or
 * cleared the queue), whether a modal dialog covers the layer, and `finish`, to call once it has closed (after its exit
 * motion) with its result — the next one is shown only then.
 */
export interface QueuedOverlayProps<Result> {
  closeRequested: boolean;
  covered: boolean;
  finish: (result: Result) => void;
}

/** The layer's one-at-a-time queue: `enqueue` resolves with the item's result once it has closed. */
export interface OverlayQueue {
  enqueue: <Result>(render: (props: QueuedOverlayProps<Result>) => ReactNode, hostResult: Result) => Promise<Result>;
  /** Closes the showing item (it resolves with its host result, after its exit motion). */
  dismissCurrent: () => void;
  /** Closes the showing item and drops the waiting ones; each resolves with its host result. */
  clear: () => void;
}

interface Queued {
  id: number;
  render: (props: QueuedOverlayProps<unknown>) => ReactNode;
  hostResult: unknown;
  resolve: (result: unknown) => void;
}

const OverlayContext = createContext<OverlayHost | null>(null);
let nextId = 1;

export interface OverlayLayerProps {
  children?: ReactNode;
  /** Host a layer of its own even inside another one (a `Modal`'s window, whose content the outer layer cannot cover). */
  own?: boolean;
  /** The layer view's test id. */
  testID?: string;
}

/** Hosts the overlay layer for everything below, unless an outer one exists (then it is that one). Package-internal. */
export function OverlayLayer({ children, own = false, testID = 'tanrei.overlay' }: OverlayLayerProps) {
  const outer = useContext(OverlayContext);
  if (outer && !own) return <>{children}</>;
  return <OverlayRoot testID={testID}>{children}</OverlayRoot>;
}

function OverlayRoot({ children, testID }: { children?: ReactNode; testID: string }) {
  const [entries, setEntries] = useState<ReadonlyMap<number, Entry>>(new Map());
  const layer = useRef<OverlayLayerNode | null>(null);
  // SNK-12: one queued item at a time, in order; the head is shown (unless a modal dialog covers the layer and it has
  // not been shown yet), and the next waits until it has finished.
  const [queued, setQueued] = useState<readonly Queued[]>([]);
  const [closeRequested, setCloseRequested] = useState(false);
  const [covers, setCovers] = useState(0);
  const shownHead = useRef<number | null>(null);
  const queue = useMemo<OverlayQueue>(
    () => ({
      enqueue: <Result,>(render: (props: QueuedOverlayProps<Result>) => ReactNode, hostResult: Result) =>
        new Promise<Result>((resolve) => {
          const item: Queued = { id: nextId++, render: render as Queued['render'], hostResult, resolve: resolve as Queued['resolve'] };
          setQueued((previous) => [...previous, item]);
        }),
      dismissCurrent: () => setCloseRequested(true),
      clear: () => {
        setQueued((previous) => {
          const [head, ...waiting] = previous;
          for (const item of waiting) item.resolve(item.hostResult);
          return head ? [head] : [];
        });
        setCloseRequested(true);
      },
    }),
    [],
  );
  const host = useMemo<OverlayHost>(
    () => ({
      queue,
      cover: (delta) => setCovers((previous) => Math.max(0, previous + delta)),
      set: (id, level, node) =>
        setEntries((previous) => {
          const next = new Map(previous);
          next.set(id, { id, level, node });
          return next;
        }),
      remove: (id) =>
        setEntries((previous) => {
          if (!previous.has(id)) return previous;
          const next = new Map(previous);
          next.delete(id);
          return next;
        }),
      layer,
    }),
    [],
  );
  const head = queued[0];
  const covered = covers > 0;
  // A head not shown yet waits while a modal dialog covers the layer; once shown, it stays (and is told it is covered).
  const showsHead = head !== undefined && (!covered || shownHead.current === head.id);
  if (showsHead) shownHead.current = head.id;
  const finish = (item: Queued) => (result: unknown) => {
    item.resolve(result);
    setCloseRequested(false);
    setQueued((previous) => previous.filter((each) => each.id !== item.id));
  };
  const queuedEntry: Entry[] = showsHead ? [{ id: head.id, level: 'snackbar', node: head.render({ closeRequested, covered, finish: finish(head) }) }] : [];
  const ordered = [...entries.values(), ...queuedEntry].sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.id - b.id);
  return (
    <OverlayContext.Provider value={host}>
      {children}
      {ordered.length > 0 ? (
        <View ref={layer} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} pointerEvents="box-none" testID={testID}>
          {ordered.map((entry) => (
            <Fragment key={entry.id}>{entry.node}</Fragment>
          ))}
        </View>
      ) : null}
    </OverlayContext.Provider>
  );
}

export interface OverlayPortal {
  /** A layer exists (a `TanreiProvider` or a dialog above this component). Without one, nothing is drawn. */
  hosted: boolean;
  /** The layer's view, to measure where it is in the window. */
  layer: RefObject<OverlayLayerNode | null> | null;
}

/**
 * Draws `node` in the nearest overlay layer at `level` while it is not null, and removes it when it becomes null or the
 * caller unmounts. The caller wraps `node` in what it needs from where it is (its theme: `TanreiThemeScope`), because
 * the layer is elsewhere in the tree. Package-internal.
 */
export function useOverlayPortal(level: OverlayLevel, node: ReactNode | null): OverlayPortal {
  const host = useContext(OverlayContext);
  const id = useRef(0);
  if (id.current === 0) id.current = nextId++;
  useEffect(() => {
    if (!host) return;
    if (node == null) host.remove(id.current);
    else host.set(id.current, level, node);
  }, [host, level, node]);
  useEffect(() => () => host?.remove(id.current), [host]);
  return { hosted: host !== null, layer: host?.layer ?? null };
}

/** The nearest layer's queue (a snackbar host), or null outside every layer. Package-internal. */
export function useOverlayQueue(): OverlayQueue | null {
  return useContext(OverlayContext)?.queue ?? null;
}

/**
 * A modal dialog covers the nearest layer while `open` (SNK-9, SNK-12: a snackbar pauses, a waiting one waits). Call it
 * OUTSIDE the dialog's own layer. Package-internal.
 */
export function useOverlayCover(open: boolean): void {
  const host = useContext(OverlayContext);
  useEffect(() => {
    if (!host || !open) return undefined;
    host.cover(1);
    return () => host.cover(-1);
  }, [host, open]);
}
