// The motions a component's motion demo plays: each duration token under its group's `motion`, with the easing token
// of the same name beside it (`open-duration` and `open-easing` are the motion `open`), resolved in the default
// system. A duration without an easing (a delay, the length of a press's answer, a busy turn) is a motion too, with no
// curve of its own. The demo names each by its id and writes its milliseconds from here, never by hand.
//
// The demo itself (components/visuals/MotionDemo.astro, its script lib/visuals/motion.client.ts) plays one of them on
// the live component: from one of its fixtures to another (`motionDemoOf`).
import { getSpec } from '../repo';
import { ns, sourceAlias } from '../tokens';
import { blueprintStageOf, type BlueprintStage } from './anatomy';
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

// ── A motion demo ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The motion role a component's duration token stands for: the `sys.motion.role.*` token its chain of aliases reaches,
 * dotted, or null where the chain ends before one (a duration written as a value).
 */
export function motionRoleOf(dotted: string): string | null {
  const seen = new Set<string>();
  for (let at = sourceAlias(dotted); at && !seen.has(at); at = sourceAlias(at)) {
    seen.add(at);
    if (at.startsWith(`${ns}.sys.motion.role.`)) return at;
  }
  return null;
}

/** The opening tags of a stage's markup, in order: the elements a demo's two fixtures must share. */
const OPENING = /<([a-z][\w-]*)(?=[\s/>])/g;
const tagsOf = (html: string) => [...html.matchAll(OPENING)].map((match) => match[1]);

/**
 * A stage's markup with each element numbered in the order it opens (`data-motion-n`), so that the demo's script finds
 * an element of one fixture's stage in the other's: the attributes that differ between the two are what the play sets.
 */
export function numbered(html: string): string {
  let n = 0;
  return html.replace(OPENING, (_match, tag: string) => `<${tag} data-motion-n="${n++}"`);
}

export interface MotionDemo {
  name: string;
  motion: Motion;
  /** The role the motion's duration stands for (`tanrei.sys.motion.role.selection.travel`), or null. */
  role: string | null;
  /** The custom property of the motion's duration, which the demo reads its milliseconds from in the stage's system. */
  durationVar: string;
  /** The custom property of every duration of the component's motion: what slow motion stretches. */
  durationVars: string[];
  /** The fixture the stage stands in before the motion, and the one it reaches: the web package's own stages. */
  from: BlueprintStage;
  to: BlueprintStage;
}

/**
 * What a component's motion demo plays: one of its motions (`id`, as `motionsOf` names it), from one of its fixtures to
 * another whose stage holds the same elements, so that the play is the attributes that differ between the two, set on
 * the live component. Refused, with the reason, where the motion is not the component's or is a delay, where a fixture
 * cannot stand in the page (lib/visuals/anatomy.ts, `blueprintStageOf`), or where the two stages are not the same
 * elements.
 */
export function motionDemoOf(name: string, id: string, from: string, to: string): MotionDemo {
  const motions = motionsOf(name);
  const motion = motions.find((candidate) => candidate.id === id && !candidate.delay);
  if (!motion) throw new Error(`MotionDemo: ${name} has no motion "${id}" (it has ${motions.map((each) => each.id).join(', ') || 'none'})`);
  const [before, after] = [from, to].map((fixture) => {
    const stage = blueprintStageOf(name, fixture);
    if (!stage) throw new Error(`MotionDemo: ${name}'s fixture ${fixture} cannot stand in the page (lib/visuals/anatomy.ts, blueprintStageOf)`);
    return stage;
  }) as [BlueprintStage, BlueprintStage];
  if (tagsOf(before.html).join(' ') !== tagsOf(after.html).join(' ')) throw new Error(`MotionDemo: ${name}'s fixtures ${from} and ${to} are not the same elements`);
  const durations = componentTokens(name).filter((token) => token.type === 'duration' && below(token, name)[0] === 'motion');
  const durationVar = durations.find((token) => token.name === motion.duration)?.cssVar;
  if (!durationVar) throw new Error(`MotionDemo: no custom property for ${motion.duration}`);
  return { name, motion, role: motionRoleOf(motion.duration), durationVar, durationVars: durations.map((token) => token.cssVar), from: before, to: after };
}

/**
 * The demo's text alternative in the page's language: the dictionary's sentence (`visuals.motionAlt`) with
 * `{component}` the component's title, `{motion}` the motion's id and `{from}` and `{to}` the two fixtures' ids.
 */
export function motionAlt(demo: MotionDemo, template: string): string {
  return template.replaceAll('{component}', getSpec(demo.name).title).replaceAll('{motion}', demo.motion.id).replaceAll('{from}', demo.from.fixture).replaceAll('{to}', demo.to.fixture);
}
