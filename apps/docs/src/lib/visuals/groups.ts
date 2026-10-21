// The token groups a component's figures read, as its Specs section reads them: the group its spec names
// (`spec.tokens`) and the shared sets it reads beside it (`sharedSetsOf`), each in the system that has them — the
// default system's, or, for a component that lives in a layer, that layer's.
import { getSpec } from '../repo';
import { ns, sharedSetsOf, tokensIn, type Token } from '../tokens';

/** Every resolved token a component reads, in one context (`light`, `dark-high`, …). */
export function componentTokens(name: string, context = 'light'): Token[] {
  const spec = getSpec(name);
  return [spec.tokens, ...sharedSetsOf(spec.name)].flatMap((group) => tokensIn(`${ns}.${group}`, context, spec.layer));
}

/** A token's path below its group (`tanrei.comp.button.container.height.large` → `container.height.large`). */
export function below(token: Token, name: string): string[] {
  const spec = getSpec(name);
  const groups = [spec.tokens, ...sharedSetsOf(spec.name)].map((group) => `${ns}.${group}`.split('.'));
  const group = groups.find((path) => path.every((key, index) => token.path[index] === key));
  return token.path.slice(group ? group.length : 0);
}
