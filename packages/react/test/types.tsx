// Type tests: what a typed React project must be able to write against the wrappers, and what it must not. Compiled by
// `pnpm --filter @tanrei/react test` (never run): an expected error that stops being one fails the compile. The
// package is imported by its own name, as a product imports it: the types are the built ones (`pnpm build` first),
// through the entries of package.json `exports`.
import { useRef } from 'react';
import type { TanreiButton, TanreiFilePicker, TanreiFilePickerJudgement, TanreiFileUpload, TanreiFileUploadRefused, TanreiSelect, TanreiSnackbarHost } from '@tanrei/web';
import {
  Button,
  type ButtonMarks,
  ButtonGroup,
  Checkbox,
  ColorField,
  Dialog,
  FileItem,
  FileUpload,
  List,
  ListItem,
  MenuItem,
  NumberField,
  RadioButton,
  RadioGroup,
  Search,
  SearchResult,
  Select,
  Slider,
  SnackbarHost,
  Switch,
  Tab,
  TabPanel,
  TabView,
  Tabs,
  type TanreiEvent,
  type TanreiWords,
  TextField,
  missingWords,
  setWords,
} from '@tanrei/react';
// The building blocks are an entry of their own; the rest of the default system is the main entry.
import { Combobox, FilePicker, NumberInput, OneTimeCodeInput, TextInput } from '@tanrei/react/advanced';
import * as all from '@tanrei/react/all';
// @ts-expect-error the FAB menu lives in the m3-like layer, which the default system does not descend from
import { FabMenu as NoFabMenu } from '@tanrei/react';
// @ts-expect-error the default system leaves the segmented button out
import { SegmentedButton as NoSegmentedButton } from '@tanrei/react';
// @ts-expect-error a building block is not in the main entry
import { TextInput as NoTextInput } from '@tanrei/react';
import { FabMenu, FabMenuItem, SegmentedButton, TextField as M3TextField } from '@tanrei/react/m3-like';
import { SegmentedButton as CupertinoSegmentedButton } from '@tanrei/react/cupertino';
// @ts-expect-error cupertino has the segmented button and not the FAB menu
import { FabMenu as NoCupertinoFabMenu } from '@tanrei/react/cupertino';
import { FabMenu as ExpressiveFabMenu } from '@tanrei/react/m3-expressive-like';

declare function use(...values: unknown[]): void;
use(NoFabMenu, NoSegmentedButton, NoTextInput, NoCupertinoFabMenu);

// Each entry is one system's components (packages/react/scripts/entries.js, from the components manifests): what the
// system leaves out is not there, and a variant value it leaves out is not a value of the prop there. The values are
// the same component's: another system's entry, `/advanced` and `/all` take every value.
export const systems = (
  <>
    <TextField label="Name" variant="stacked" />
    {/* @ts-expect-error the default system leaves the outlined field out */}
    <TextField label="Name" variant="outlined" />
    {/* @ts-expect-error and the filled one */}
    <Select label="Size" variant="filled" />
    <M3TextField label="Name" variant="outlined" />
    <TextInput variant="filled" />
    <all.TextField label="Name" variant="outlined" />
    <FabMenu label="Create" variant="tonal">
      <FabMenuItem label="Note" />
    </FabMenu>
    <ExpressiveFabMenu label="Create" />
    <all.FabMenu label="Create" />
    <SegmentedButton label="View" />
    <CupertinoSegmentedButton label="View" />
  </>
);

// The action marks (BGR-13, BGR-14) are attributes the placing component reads, typed as props of Button.
const marks: ButtonMarks = { confirming: true, dismissive: false };
export const actions = (
  <Dialog open headline="Discard draft?">
    <ButtonGroup label="Draft">
      <Button variant="outlined" dismissive={marks.dismissive}>Cancel</Button>
      <Button slot="actions" confirming onClick={(event) => use(event.currentTarget.variant)}>Discard</Button>
    </ButtonGroup>
    {/* @ts-expect-error a mark is a boolean */}
    <Button confirming="yes">Save</Button>
    {/* @ts-expect-error not a property, a mark or an HTML attribute */}
    <Button confirmed>Save</Button>
  </Dialog>
);

// A Button in a form (BTN-27 … BTN-31): `type`, `name` and `value` are properties of the element; `form` is the id of
// a form, an attribute, though the element's own `form` property returns the form.
export const form = (
  <>
    <form id="checkout">
      <TextField label="Card" name="card" />
      <Button type="submit" name="intent" value="pay" label="Pay: this order" onClick={(event) => use(event.currentTarget.form satisfies HTMLFormElement | null)}>Pay</Button>
      <Button type="reset" variant="text">Clear</Button>
    </form>
    <Button type="submit" form="checkout">Pay</Button>
    {/* @ts-expect-error a type the button does not define */}
    <Button type="send">Send</Button>
    {/* @ts-expect-error the form is named by its id */}
    <Button form={document.forms[0]}>Send</Button>
  </>
);

// Every form-associated element takes `form` as Button does: the id of a form it stands outside of, written as the
// attribute — the element's own `form` property has only a getter and returns the form, which is still what a ref and
// an event's `currentTarget` read.
export const formOwners = (
  <>
    <form id="order" />
    <TextField label="Card" name="card" form="order" onChange={(event) => use(event.currentTarget.form satisfies HTMLFormElement | null)} />
    <NumberField label="Count" name="count" form="order" />
    <ColorField label="Color" name="color" form="order" />
    <OneTimeCodeInput label="Code" name="code" form="order" />
    <Select label="Size" name="size" form="order" />
    <Combobox label="City" name="city" form="order" />
    <Checkbox label="Gift" name="gift" form="order" />
    <Switch label="Express" name="express" form="order" />
    <Slider label="Tip" name="tip" form="order" />
    <RadioButton label="Card" name="pay" value="card" form="order" />
    <RadioGroup label="Payment" name="payment" form="order" />
    <Search label="Search" name="q" form="order" />
    <FileUpload label="Receipt" name="receipt" form="order" />
    {/* @ts-expect-error the form is named by its id */}
    <TextField label="Card" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <NumberField label="Count" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <ColorField label="Color" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <OneTimeCodeInput label="Code" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <Select label="Size" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <Combobox label="City" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <Checkbox label="Gift" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <Switch label="Express" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <Slider label="Tip" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <RadioButton label="Card" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <RadioGroup label="Payment" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <Search label="Search" form={document.forms[0]} />
    {/* @ts-expect-error the form is named by its id */}
    <FileUpload label="Receipt" form={document.forms[0]} />
  </>
);

// A listener is on the element, so `currentTarget` is the element — also where the event is a plain Event.
const onSelectChange = (event: TanreiEvent<TanreiSelect>) => use(event.currentTarget.value satisfies string);
export const fields = (
  <>
    <Select label="Unit" value="px" onChange={onSelectChange} />
    <TextField label="Name" onChange={(event) => use(event.currentTarget.value satisfies string)} />
    <ColorField label="Accent" onChange={(event) => use(event.currentTarget.value)} />
    <Button toggle label="Mute" onChange={(event) => use(event.detail.selected satisfies boolean, event.currentTarget satisfies TanreiButton)} />
    {/* @ts-expect-error a select's change carries no detail of its own */}
    <Select label="Unit" onChange={(event) => use(event.detail.value)} />
  </>
);

// An event with a native name and a detail of the element's own is the element's event, not React's synthetic one.
export const details = (
  <>
    <Slider label="Volume" onInput={(event) => use(event.detail.value satisfies number, event.currentTarget.value)} onChange={(event) => use(event.detail.value)} />
    <NumberField label="Radius" onInput={(event) => use(event.detail.value satisfies number | null)} onChange={(event) => use(event.currentTarget.value)} />
    {/* The bare number input, and the composed field's value: each a number or null. */}
    <NumberInput label="Scale" name="scale" form="order" noSteppers onInput={(event) => use(event.detail.value satisfies number | null)} onChange={(event) => use(event.currentTarget.value satisfies number | null)} onEntryerror={(event) => use(event.detail.text satisfies string)} />
    {/* A native event without one stays React's: the search's input is its synthetic event. */}
    <Search label="Search" onInput={(event) => use(event.nativeEvent, event.currentTarget.value)} onSelect={(event) => use(event.detail.value)}>
      <SearchResult value="/tokens/" headline="Tokens" />
    </Search>
  </>
);

// A union detail is narrowed by the key it has: `value` for a single selection, `values` for a multiple one.
export const lists = (
  <List selection="single" label="Theme" onChange={(event) => use('value' in event.detail ? event.detail.value : event.detail.values)}>
    <ListItem value="light">Light</ListItem>
  </List>
);

// A menu item's click is listened to on the element: the native MouseEvent.
export const item = <MenuItem label="Rename" onClick={(event) => use(event.clientX satisfies number, event.currentTarget.label)} />;

// A ref is the element, with its methods.
export function Snackbars() {
  const host = useRef<TanreiSnackbarHost>(null);
  use(host.current?.show({ message: 'Saved' }));
  return <SnackbarHost ref={host} />;
}

// The three components of a file. A file picker's ref judges files that came another way (FPK-31); a
// file upload's reads the kept files, hands files over and clears (FUP-46 to FUP-48); a file item's `file` is a
// property, and its `remove` and `retry` are heard on the element. (The events' details are not typed for React.)
export function Files() {
  const picker = useRef<TanreiFilePicker>(null);
  const upload = useRef<TanreiFileUpload>(null);
  use(picker.current?.judge([]) satisfies TanreiFilePickerJudgement | undefined);
  use(upload.current?.files satisfies File[] | undefined, upload.current?.add([]) satisfies TanreiFileUploadRefused[] | undefined, upload.current?.clear());
  return (
    <>
      <FilePicker ref={picker} label="Layer file" accept={['.json']} maxFiles={1} selectionText="No file chosen" onSelect={(event) => use(event.currentTarget.judge([]).accepted satisfies File[])} onReject={(event) => use(event.currentTarget.maxFiles satisfies number | null)}>
        <Button slot="trigger" variant="outlined">Choose a file</Button>
      </FilePicker>
      <FileUpload ref={upload} rows="given" itemForm="tile" itemPreview itemWidth={160} itemHeight={90} formatSize={(bytes) => String(bytes)} onChange={(event) => use(event.currentTarget.files satisfies File[])}>
        <Button slot="trigger" variant="outlined">Choose files</Button>
        <FileItem value="a" name="brief.pdf" sizeText="820 KB" status="uploading" progress={0.4} file={null} onRemove={(event) => use(event.currentTarget.value satisfies string)} onRetry={(event) => use(event.currentTarget.status)} />
      </FileUpload>
      <FileItem form="tile" preview previewSrc="/thumbnails/a.png" fit="contain" nameHidden readOnly name="floor-plan.png" href="/files/floor-plan.png" target="new" targetLabel="opens in a new tab" />
      {/* @ts-expect-error a file picker takes no part in a form (FPK-7): it has no name */}
      <FilePicker name="attachment" />
      {/* @ts-expect-error a form the file item does not have */}
      <FileItem form="chip" name="brief.pdf" />
      {/* @ts-expect-error the file item judges nothing: judge() is the file picker's */}
      <FileItem name="brief.pdf" ref={(item) => use(item?.judge([]))} />
    </>
  );
}

// Tabs and the Tab view: three variants, two sizes, a track that is true, false or left to the design
// system, and the transition of each — the row's has no fade.
export function TabsOfEveryKind() {
  return (
    <>
      <Tabs variant="tonal" size="small" track={false} transition="none" label="Contrast" value="standard" onChange={(event) => use(event.detail.value satisfies string)}>
        <Tab value="standard" label="Standard" />
        <Tab value="high" label="High" />
      </Tabs>
      <Tabs variant="secondary" track transition="slide" />
      <Tabs track={null} transition="auto" />
      <TabView variant="tonal" size="small" track={false} transition="fade" label="Platform" onChange={(event) => use(event.detail.value satisfies string)}>
        <TabPanel value="web" label="Web" />
      </TabView>
      <TabView transition="none" />
      {/* @ts-expect-error the row's indicator has no fade: fade is the Tab view's */}
      <Tabs transition="fade" />
      {/* @ts-expect-error a transition the Tab view does not have */}
      <TabView transition="page" />
      {/* @ts-expect-error the track is true, false or null */}
      <Tabs track="ghost" />
    </>
  );
}

// What a form asks of a field is two booleans, as HTML says the first: `required`, and `optional` for the optional tag
// (FLD-4, FGR-4). `requirement` is no prop.
export const required = (
  <>
    <TextField label="Email" required />
    <NumberField label="Seats" optional />
    <RadioGroup label="Delivery" required />
    <FilePicker required />
    {/* @ts-expect-error required is a boolean */}
    <TextField label="Email" required="yes" />
    {/* @ts-expect-error requirement is no prop of a field */}
    <TextField label="Email" requirement="required" />
  </>
);

// The product's words are given through the same package: Tanrei ships none.
const words: TanreiWords = {};
setWords(words);
use(missingWords() satisfies readonly unknown[]);
