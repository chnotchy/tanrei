# Security policy

Please report vulnerabilities privately through GitHub's **Report a vulnerability** (Security → Advisories) on this repository rather than opening a public issue. You will get an acknowledgement within a week.

Scope: the published packages and the build tooling in this repository. Tanrei ships UI code and design tokens; it does not handle credentials or network traffic, so the most likely issues are supply-chain (dependencies, release workflows) and XSS-class bugs in Web Components that render user content.

Fixes land on `main` and are published with the next version. Before 1.0, only the newest version receives them: the newest release of the latest minor version or, while that minor's prereleases are published (`0.1.0-next.N`, under the npm dist-tag `next`), the newest prerelease. Older versions are not patched.
