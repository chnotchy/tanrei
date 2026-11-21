---
'@tanrei/web': patch
'@tanrei/react': patch
---

Popover, Select and Combobox: a surface that appears starts its entrance in the first frame drawn after it opens. In
Safari and other WebKit browsers an entrance begun at the end of a long task — a list whose rows were rendered by the
key that opened it, on a slow machine — was dated from the frame drawn before that task: part of it was over before
its first frame, and all of it, the surface drawn whole at once, where the task outlasted the entrance.
