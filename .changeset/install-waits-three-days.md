---
---

The repository's installs now wait three days before taking a newly published dependency version (`minimumReleaseAge: 4320`, strict because it is set explicitly) and refuse a version published with weaker trust evidence than an earlier release of the same package (`trustPolicy: no-downgrade`); three old releases the lockfile already holds are excepted by exact version. No change to what the packages ship.
