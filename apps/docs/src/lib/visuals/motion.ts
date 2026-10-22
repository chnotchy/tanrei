// The motions a component's motion demo plays: each duration token under its group's `motion`, with the easing token
// of the same name beside it (`open-duration` and `open-easing` are the motion `open`), resolved in the default
// system. A duration without an easing (a delay, the length of a press's answer, a busy turn) is a motion too, with no
// curve of its own. The demo names each by its id and writes its milliseconds from here, never by hand.
import { below, componentTokens } from './groups';

export interface Motion {
  /** The name before `-duration` or `-delay` (`state`, `open`, `submenu`). */
  id: string;
  /** Whether it is a delay before something happens rather than the time it takes. */
  delay: boolean;
  /** The duration token, dotted. */
  duration: string;
  ms: number;
  /** The easing token of the same name, dotted, or null where the component names none. */
  easing: string | null;
  /** That easing's control points (x1, y1, x2, y2), or null. */
  bezier: [number, number, number, number] | null;
}

const ENDS = /-(duration|delay)$/;

export function motionsOf(name: string): Motion[] {
  const tokens = componentTokens(name).filter((token) => below(token, name)[0] === 'motion');
  const byName = new Map(tokens.map((token) => [below(token, name).slice(1).join('.'), token]));
  return tokens
    .filter((token) => token.type === 'duration' && ENDS.test(token.path.at(-1)!))
    .map((token) => {
      const key = below(token, name).slice(1).join('.');
      const id = key.replace(ENDS, '');
      const easing = byName.get(`${id}-easing`);
      return {
        id,
        delay: key.endsWith('-delay'),
        duration: token.name,
        ms: token.value.value as number,
        easing: easing?.name ?? null,
        bezier: easing ? (easing.value as [number, number, number, number]) : null,
      };
    });
}
