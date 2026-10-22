// The color roles a component's role map draws: each color token it reads, the chain of aliases it is written as —
// from the component's token through any other component token to the system's color role — and what every shipped
// system resolves it to. The chain is the core's, as written in `tokens/comp/` (a layer may alias the same token to
// another role, and its resolved value says so); the values are each system's own.
import { anatomyOf } from './anatomy';
import { below, componentTokens } from './groups';
import { ns, shippedSystems, sourceAlias, systemValue } from '../tokens';

export interface Role {
  /** The component's color token, dotted. */
  token: string;
  /** The anatomy part its path names, or null. */
  part: string | null;
  /** The aliases after the token, in order, as written; the last is a value's token or a role. */
  chain: string[];
  /** The first color role of the system in the chain (`tanrei.sys.color.primary`), or null where the token is a literal. */
  role: string | null;
  /** System id → the value it resolves the token to, as text (`#6750a4`). */
  values: Record<string, string>;
}

function chainOf(token: string): string[] {
  const chain: string[] = [];
  for (let at = sourceAlias(token); at && !chain.includes(at); at = sourceAlias(at)) chain.push(at);
  return chain;
}

/** Every color token of a component; with `keys`, those whose path holds every key (`['filled', 'selected']`). */
export function rolesOf(name: string, keys: string[] = []): Role[] {
  const parts = new Set(anatomyOf(name).map((part) => part.id));
  const sys = `${ns}.sys.color.`;
  return componentTokens(name)
    .filter((token) => token.type === 'color' && keys.every((key) => below(token, name).includes(key)))
    .map((token) => {
      const chain = chainOf(token.name);
      return {
        token: token.name,
        part: below(token, name).find((key) => parts.has(key)) ?? null,
        chain,
        role: chain.find((alias) => alias.startsWith(sys)) ?? null,
        values: Object.fromEntries(shippedSystems.map((system) => [system.id, systemValue(system, token.name)])),
      };
    });
}
