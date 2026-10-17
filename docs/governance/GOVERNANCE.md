# Governance

The maintainers decide what Tanrei becomes. Most rules are **mechanical**: they live in checks that every change goes through, not in meetings.

## Taking part

- **Issues are welcome**: bug reports, questions, and proposals for a component, a token or a change of behaviour. Open one at <https://github.com/chnotchy/tanrei/issues>.
- **Pull requests are not accepted for now.** The maintainers make the changes, through the same checks a pull request would go through. When that changes, this file and [`CONTRIBUTING.md`](../../CONTRIBUTING.md) will say so.
- **Security problems are reported privately**, as [`SECURITY.md`](../../SECURITY.md) describes: never in a public issue.
- **Conduct** follows the [Code of Conduct](../../CODE_OF_CONDUCT.md).

## Roles

- **Maintainers** — own the direction, decide what the specs and tokens become, review and make changes, and are the only role that publishes releases or changes repository settings. `CODEOWNERS` lists them.
- **Contributors** — report problems, propose changes and discuss them in issues.

## Decisions

| Kind | How |
|---|---|
| A fix, a platform implementation, docs, a non-breaking addition to a spec | Raised in an issue or made by the maintainers; every change goes through the same checks |
| A new component, a breaking change, a change to the core token vocabulary | An issue first; the maintainers decide, and the decision reaches the repository as a spec or token change |
| Release, registry ownership, repository settings | Maintainers only |

Decisions are recorded where they take effect: in the specs and tokens, in `AGENTS.md` and `CONTRIBUTING.md` as the current rules, and in the changelog from the first release on.

## Stability promises

- Versions are lockstep across platforms; the status matrix at a version is the statement of what that version contains.
- Until the web components reach `alpha`, every version is a prerelease on the `next` line (`0.1.0-next.N`, published under the npm dist-tag `next`, never `latest`): what is installed without a tag is nothing, by design. `0.1.0` is the first release, when the web is `alpha`; a platform whose CI is paused is published only once it has caught up. The prerelease tag is `next` and not `alpha` or `beta` because those words are component statuses here, with their own meaning.
- `stable` components follow semver on their spec surface. Token **names** in `sys` and `comp` are public API; token **values** may change in minor releases when the change is visual refinement, and are called out in the changelog.
- During the 0.x prereleases no backward compatibility is kept: a name, a shape or a behaviour that changes is changed
  everywhere at once, with no deprecated alias, shim or fallback for the old one, and the changeset says what broke.
  Once a version is released outside the prerelease line, deprecations last at least one minor release and are visible
  in the spec (`deprecated`), the matrix and the docs.

## Sustainability

The cost that kills multi-platform systems is divergence. Tanrei spends its effort on the machinery that prevents it (two sources of truth, generated artifacts, parity and drift checks, snapshot baselines under shared fixture ids), so that adding a component costs about what the first did, and anyone who has never seen the repository — a person or an agent — can do it by following `AGENTS.md` and the `add-component` skill.
