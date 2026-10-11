<!--
  The specimen document of prose. One source for every platform's baselines.

  A fixture's `content` names a section below (`<!-- section: <name> -->` … up to the next section marker).
  `specimen` is the whole file from its marker to the end of that section. Each harness builds the section in a
  container 720 wide (so the measure shows: text blocks stop at 504, or 576 at size large, and blocks that are not
  text run to 720), on the surface color, at the default text size.

  Placeholders: `[[code-block]]`, `[[table]]`, `[[callout]]`, `[[figure]]` stand for Phase A's components. Until
  each exists a harness draws a box of surface-container, 96 high, as wide as the prose, labelled with the name;
  it is replaced by the real component when that component lands, and the baseline is re-recorded with the reason.

  The second paragraph of the specimen holds two links in running text: one inside the site, and one
  that leaves it, written as a content pipeline writes it (`markExternalLinks()` of the web package, or its like on
  another platform): the external mark's attribute, its words, and the site's picture as a file of the product's own
  (`fixtures/site-icon.png`, which each harness resolves to its copy). A harness that builds the specimen from
  Markdown passes that anchor through as it is.

  All text here is written for this file.
-->

<!-- section: specimen -->

# Keeping a field notebook

A field notebook is the cheapest instrument a surveyor carries and the one most often left behind. This page describes how ours are kept, why the rules are what they are, and what to do when a page is spoiled.

The printed rules are in [the survey manual](/manual/), and the tolerances they rest on are set by <a href="https://example.com/standards/levelling" data-external="true" aria-description="external link"><img class="tanrei-link-site-icon" src="fixtures/site-icon.png" alt="" width="32" height="32" loading="lazy" decoding="async" referrerpolicy="no-referrer">the national levelling standard</a>.

## What goes in

Write down what you **saw**, not what you concluded. A reading, the time, the weather and *who held the staff* are facts; "the bank looked unstable" is an opinion and belongs in the margin, marked as one. <small>Margins are 30 mm; do not write past them.</small>

Three things are recorded for every station:

- the station's number, as painted on the peg
- the instrument height, to the millimetre
- every reading taken from it, in the order taken
  - back sights first
  - then intermediate sights
    - with the staff position noted for each

Before leaving a station:

1. Close the level loop and write the misclosure.
2. Read the last entry back to the staff holder.
3. Sign the foot of the page.
   1. Initials are enough.
   2. The date is not optional.
4. Photograph the page.
5. Cap the pen.

### Corrections

Never erase. Strike the wrong figure through once so that it stays legible, write the right one above it, and initial the change. A page with ~~three~~ four or more corrections is copied out in full and the original kept[^1].

> A notebook is evidence. Whoever reads it in ten years will not be able to ask you what you meant.
>
> Write for that reader.

#### When a page is spoiled

Draw one diagonal line across it and write *spoiled* along the line. Do not tear it out: the pages are numbered, and a missing number is a question nobody can answer.

##### Rain

Pencil survives rain; most inks do not. Carry both.

###### Abbreviations

Use only the ones printed inside the cover.

---

Station
: A point occupied by the instrument.

Turning point
: A point read twice, once from each of two stations, that carries the level forward.

Checklist for a new notebook:

- [x] Number every page
- [x] Write the job and the year on the cover
- [ ] Copy the abbreviations inside the cover

A paragraph may hold a link to [the survey manual](https://example.com/manual), a function such as `closeLoop()`, and a shortcut. A long unbroken string must wrap and not overflow: https://example.com/a/very/long/path/that/has/no/natural/place/to/break/anywhere/at/all/in/its/whole/length

[^1]: Kept, not filed: the original stays in the notebook.

<!-- section: headings -->

# Heading one

## Heading two

### Heading three, directly under heading two

A paragraph under a heading, long enough to wrap onto a second line so that the space above and below it can be read against the height of a line of running text.

#### Heading four

##### Heading five

###### Heading six

A paragraph closes the section.

## A heading long enough to wrap: how a second line sits under the first when the column is narrow

A paragraph after the long heading.

<!-- section: lists -->

- First item
- Second item, long enough to wrap onto a second line so that the second line can be seen to begin under the first line's text and not under its marker
  - Nested, second depth
    - Nested, third depth
      - Nested, fourth depth
- Third item

1. One
2. Two
   1. Two, first
      1. Two, first, first
3. Three

8. Eight
9. Nine
10. Ten
11. Eleven

- A loose item.

  Its second paragraph.

- Another loose item.

  > With a quote inside.

- [x] Done
- [ ] Not done
- [ ] Not done, and long enough to wrap onto a second line so that its mark can be seen centred on the first line only

<!-- section: quote-and-rule -->

A paragraph before the quote.

> A quote of one paragraph.

> A quote of two paragraphs, the first long enough to wrap onto a second line so the line along its edge can be seen to run its whole height.
>
> The second paragraph.
>
> > A quote inside the quote.

A paragraph between.

---

A paragraph after the rule.

<!-- section: blocks -->

A paragraph of running text, long enough to reach the measure so that the block below it can be seen to run wider than the text does when the container is wide.

[[code-block]]

A paragraph between two blocks.

[[table]]

[[callout]]

## A heading directly after a block

[[figure]]

A closing paragraph.

<!-- section: anchors -->

<!-- Every heading in this section has an anchor. The harness draws it shown (as on a device without hover). -->

## A section

Text.

### A subsection with a longer title, so that the anchor is seen to stay with the last word when the title wraps

Text.

###### A small heading

Text.

<!-- section: measure -->

A line of reading text has a longest comfortable length. This paragraph is long enough to run well past it on a wide stage: with the measure on it stops at thirty-six ems of its own size and the rest of the stage stays empty beside it; with the measure off it fills the stage from edge to edge, which is right only where the stage is already narrow.

[[table]]

- A list item that is also long enough to run past the measure on a wide stage, so that lists can be seen to follow the same limit as paragraphs do.

<!-- section: japanese -->

<!-- The harness sets the language to ja on the prose. -->

# 野帳のつけ方

野帳は測量士が持ち歩く道具のなかで最も安く、そして最も忘れられやすいものです。このページでは、野帳をどうつけるか、なぜそう決めているか、書き損じたときにどうするかを説明します。

## 何を書くか

**見たこと**を書きます。*考えたこと*は余白に、それと分かるように書きます。読み値、時刻、天気、「誰が標尺を持ったか」は事実です。

- 杭に書かれた測点番号
- 器械高（ミリメートルまで）
- その測点から読んだすべての値を、読んだ順に

### 訂正

消してはいけません。誤った数字に一本線を引き、正しい数字をその上に書いて、`closeLoop()` の結果とともに頭文字を添えます。

> 野帳は証拠です。十年後に読む人は、あなたに意味を尋ねることができません。

<!-- section: rtl -->

<!-- Drawn right-to-left (the fixture's direction); the harness sets the language to ar on the prose. -->

# دفتر الميدان

دفتر الميدان أرخص أداة يحملها المسّاح، وأكثر ما يُنسى. تشرح هذه الصفحة كيف نكتب فيه ولماذا.

## ماذا نكتب

- رقم المحطة كما هو مكتوب على الوتد
- ارتفاع الجهاز بالمليمتر
  - القراءة الخلفية أولاً
  - ثم القراءات الوسطى

1. أغلق الحلقة.
2. اقرأ آخر قيمة بصوت مسموع.
3. وقّع أسفل الصفحة.

> الدفتر دليل. من يقرؤه بعد عشر سنوات لن يستطيع أن يسألك.

---

- [x] رقّم كل صفحة
- [ ] اكتب السنة على الغلاف

<!-- section: mixed-direction -->

<!-- Drawn right-to-left. No block states a direction except the last. -->

## closeLoop() والإغلاق

اتصل بالمكتب على +1 555 0100 أو راسل survey@example.com قبل الساعة 17:30.

This paragraph is English inside a right-to-left prose and states no direction: its words keep their order, its period stays at its right end, and its lines begin at the right edge.

- Station 12
- المحطة 13
- v2.4.1

<p dir="ltr">This paragraph states left-to-right: it is laid out wholly left-to-right, and its lines begin at the left edge.</p>
