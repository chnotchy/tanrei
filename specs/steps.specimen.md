<!--
  The specimen document of steps, for the fixtures whose bodies hold more than a line of text.
  One source for every platform's baselines, in the form of prose's specimen.

  A fixture's `content` names a section below (`<!-- section: <name> -->` … up to the next section marker). Each
  harness builds the section as prose of the fixture's size, with a measure, in a container 720 wide on the
  surface color at the default text size; every ordered list at the top level of the section is a set of steps
  with the fixture's props, each item a step and the item's blocks its body. An ordered or unordered list inside
  an item is a list of the body (STP-9), not steps.

  A step's title: an item whose first block is a level 4 heading gives that heading to the step's title slot
  (STP-6); no other item has a title. Strong text at the beginning of a paragraph is strong text.

  Placeholders: `[[code-block]]`, `[[table]]`, `[[tabs]]` and `[[callout]]` stand for those components. Where one
  does not exist yet on a platform its harness draws a box of surface-container, 96 high, as wide as the step's
  body, labelled with the name; it is replaced by the real component when that component lands, and the baseline
  is re-recorded with the reason.

  All text here is written for this file.
-->

<!-- section: with-code -->

1. Add the package to the project. The command writes one line to the manifest and nothing else.

   [[code-block]]

2. Load the stylesheet once, before any other style of the page.

   [[code-block]]

   A page that is built without a bundler points at the files instead: the stylesheet as it is, and the one script that carries every element.

   [[code-block]]

3. Write the elements where they are needed.

   [[code-block]]

<!-- section: with-table-and-tabs -->

1. **Start a layer** — from the default system or from one of the presets.

   [[code-block]]

   The command writes two files and changes nothing that already exists.

2. **Say where each output goes.** List only the platforms the product ships.

   [[tabs]]

3. **Build.** Commit what the build writes.

   [[callout]]

4. **Use it.** Each platform reads the file written for it.

   [[table]]

<!-- section: nested-list -->

1. Open the settings and choose the account to move.

2. Export its data:

   1. choose the format the new service reads;
   2. leave attachments selected, unless the archive would be larger than the limit;
   3. wait for the message that says the archive is ready.

3. Before the old account is closed, check that the archive holds

   - every folder, with its name unchanged,
   - the address book,
   - the rules that sorted incoming mail.

4. Close the old account.

<!-- section: in-prose -->

Moving a notebook from one surveyor to another takes a few minutes and is done at the office, never in the field. Both people are present, and the notebook's index is brought up to date first.

1. The surveyor who hands the notebook over signs the last written page under the last entry, and writes the date and the word "transferred" beside the signature.

2. The surveyor who takes it writes their name on the first empty page, with the date, and begins a new page for their first entry. No page is shared by two hands.

3. The office records the transfer in the register: the notebook's number, both names, the date and the number of the last page written.

A notebook that is handed over without these three entries is treated as lost until its last surveyor has been asked.

<!-- section: titles-as-headings -->

1. #### Sign the last page

   The surveyor who hands the notebook over signs under the last entry and writes the date beside the signature.

2. #### Begin a new page

   The surveyor who takes it writes their name on the first empty page and begins there. No page is shared by two hands.

3. #### Record the transfer

   The office writes the notebook's number, both names and the date in the register.

<!-- section: with-code-rtl -->

1. أضف الحزمة إلى المشروع. يكتب الأمر سطرًا واحدًا في ملف التعريف.

   [[code-block]]

2. حمّل ورقة الأنماط مرة واحدة قبل أي نمط آخر في الصفحة.

   [[code-block]]

3. اكتب العناصر حيث تحتاج إليها، ثم شغّل `npm run build` للتحقق.
