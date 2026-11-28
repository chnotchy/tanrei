---
'@tanrei/docs': patch
---

Documentation site: the Text field's examples of multi-line fields and the Date and time picker's open pickers hold the
room they are drawn in before their elements are defined, through the web package's cloak. A reader who reached them
before their modules arrived saw the page move as they were drawn: by 0.33 (Text field, 390 px wide) and 0.68 (Date and
time picker, 390 px wide) under the figure they were looking at. A new browser test, run in each engine, holds every
element's module back, pages through the Text field's, the Date and time picker's and the Japanese Select's pages, and
asks that each figure and table is as high once its elements are defined as it was before.
