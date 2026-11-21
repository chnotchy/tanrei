---
'@tanrei/web': patch
---

Calendar: in the year view, the view toggle no longer reaches over the first row of years. Where the minimum target is
taller than the toggle (48 over 36), its hit area filled the whole navigation row, down to the row of years that starts
where the navigation row ends, so a press just above a year went to the toggle. In the year view it now stops halfway
across the space below it. In the day view the row below holds weekday names, which take no press, so the toggle keeps
its whole target there. CAL-6 now says this. Nothing is drawn differently.
