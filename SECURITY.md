# Security policy

Please report vulnerabilities privately through GitHub's **Report a vulnerability** (Security → Advisories) on this repository rather than opening a public issue. You will get an acknowledgement within a week.

Scope: the published packages and the build tooling in this repository. Tanrei ships UI code and design tokens; it does not handle credentials or network traffic, so the most likely issues are supply-chain (dependencies, release workflows) and XSS-class bugs in Web Components that render user content.

Nothing has been released yet: until the first release, fixes land on `main`. After it, only the latest released minor version receives fixes before 1.0.
