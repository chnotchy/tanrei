---
---

The repository's workflows are audited by zizmor in CI, on every change under `.github/`, and its first findings are fixed: checkouts keep no git credential unless a step pushes, matrix values and step outputs reach scripts through the environment, the docs deployment uses no Actions cache, and release.yml calls ci.yml in the self-repository form. No change to what the packages ship.
