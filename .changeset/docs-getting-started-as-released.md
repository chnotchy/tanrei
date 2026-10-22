---
'@tanrei/docs': patch
---

Documentation site: the getting-started pages read as they will from 0.1.0 on, in the six languages. The Web, React
and Your own design system pages install from npm first (`npm install @tanrei/web`, `@tanrei/react` with
`@tanrei/web`, `@tanrei/cli` as a development dependency, `npx -y @tanrei/mcp`) and build from the source second;
Getting started no longer says that nothing has been released. One notice at the top of each install page says what
differs today, from the version in `tanrei.config.json` and the paused platforms: while the version is a prerelease,
its dist-tag and what to install until the release (during the 0.x prereleases backward compatibility is not kept);
on a paused platform's guide, that it is not published until it catches up with the specs. Where nothing differs the
notice draws nothing, so the pages need no edit when 0.1.0 is released. A paused platform's registry steps are under
"Once it is published". The governance now says what npm's `latest` is until 0.1.0.
