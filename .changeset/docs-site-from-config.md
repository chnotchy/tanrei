---
'@tanrei/docs': patch
---

Documentation site: its address is read from `site` in `tanrei.config.json`.

- The canonical URLs, the sitemap, `robots.txt` and the origin the link step counts as the site's own all take it from
  there. `robots.txt` is now written by the build; its content is unchanged.
