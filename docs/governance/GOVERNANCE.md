# Governance

The maintainers decide what Tanrei becomes. Most rules are **mechanical**: they live in checks that every change goes through, not in meetings.

## Taking part

- **Outside contributions are not accepted.** The maintainers make every change, through the same checks any change goes through. Pull requests from outside are closed unmerged, and proposals for new components or tokens are not taken. The reason is the supply chain: every change from outside is a way for code the maintainers did not write to reach the products that install Tanrei, and the current security climate makes that a risk the project does not take ([`CONTRIBUTING.md`](../../CONTRIBUTING.md#outside-contributions-are-not-accepted)).
- **Issues are for bug reports and questions.** Open one at <https://github.com/chnotchy/tanrei/issues>.
- **Security problems are reported privately**, as [`SECURITY.md`](../../SECURITY.md) describes: never in a public issue.
- **Conduct** follows the [Code of Conduct](../../CODE_OF_CONDUCT.md).

## Roles

- **Maintainers** — own the direction, decide what the specs and tokens become, review and make changes, and are the only role that publishes releases or changes repository settings. `CODEOWNERS` lists them.
- **Users** — report bugs and ask questions in issues.

## Decisions

| Kind | How |
|---|---|
| A fix, a platform implementation, docs, a non-breaking addition to a spec | Made by the maintainers, from a bug report or of their own accord; every change goes through the same checks |
| A new component, a breaking change, a change to the core token vocabulary | The maintainers decide, before the spec or tokens change; the decision reaches the repository as a spec or token change |
| Release, registry ownership, repository settings | Maintainers only |

Decisions are recorded where they take effect: in the specs and tokens, in `AGENTS.md` and `CONTRIBUTING.md` as the current rules, and in the changelog from the first release on.

## Stability promises

- **During the 0.x prereleases, backward compatibility is not kept.** Any prerelease may break anything — a prop, an event, a token's name, a default — with no deprecation period first; the changeset of each change, and so the changelog, says what broke and what to use instead. The semver and deprecation promises below do not apply to the 0.x prereleases.
- Versions are lockstep across platforms; the status matrix at a version is the statement of what that version contains.
- Until the web components reach `alpha`, every version is a prerelease on the `next` line (`0.1.0-next.N`, published under the npm dist-tag `next`, never `latest`): what is installed without a tag is nothing, by design. `0.1.0` is the first release, when the web is `alpha`; a platform whose CI is paused is published only once it has caught up. The prerelease tag is `next` and not `alpha` or `beta` because those words are component statuses here, with their own meaning.
- `stable` components follow semver on their spec surface. Token **names** in `sys` and `comp` are public API; token **values** may change in minor releases when the change is visual refinement, and are called out in the changelog.
- During the 0.x prereleases no backward compatibility is kept: a name, a shape or a behaviour that changes is changed
  everywhere at once, with no deprecated alias, shim or fallback for the old one, and the changeset says what broke.
  Once a version is released outside the prerelease line, deprecations last at least one minor release and are visible
  in the spec (`deprecated`), the matrix and the docs.

## Sustainability

The cost that kills multi-platform systems is divergence. Tanrei spends its effort on the machinery that prevents it (two sources of truth, generated artifacts, parity and drift checks, snapshot baselines under shared fixture ids), so that adding a component costs about what the first did, and anyone who has never seen the repository — a person or an agent — can do it by following `AGENTS.md` and the `add-component` skill.
