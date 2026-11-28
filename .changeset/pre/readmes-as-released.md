---
'@tanrei/web': patch
'@tanrei/cli': patch
'@tanrei/mcp': patch
'@tanrei/token-engine': patch
---

The READMEs on npm no longer say that the packages are not on npm. Each is written as it reads from 0.1.0 on
(`npm install @tanrei/web`), and what it says exists — the version, what to install while it is a prerelease, each
platform's components by status — is written by `pnpm generate` from the repository, so it never claims more than is
there. During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, and its
changeset says what broke.

`@tanrei/web`'s README is a short guide for its users (it was 953 KB, and npm showed only its first 65,536
characters); the implementation notes it held stay in the repository as `packages/web/IMPLEMENTATION.md`, which the
package does not ship.
