---
---

The release workflow's preflight and registry jobs read and write no Actions cache (`cache-mode: none`, and setup-node's, flutter-action's and setup-gradle's caches off), and their checkouts keep no git credential except the npm job's, which pushes the release tags. No change to what the packages ship.
