// Type tests: what a typed React project must be able to write against the wrappers, and what it must not. Compiled by
// `pnpm --filter @tanrei/react test` (never run): an expected error that stops being one fails the compile.
import { useRef } from 'react';
import type { TanreiButton, TanreiFilePicker, TanreiFilePickerJudgement, TanreiFileUpload, TanreiFileUploadRefused, TanreiSelect, TanreiSnackbarHost } from '@tanrei/web';
import {
  Button,
  type ButtonMarks,
  ButtonGroup,
  Checkbox,
  ColorField,
  Combobox,
  CopyButton,
  Dialog,
  FileItem,
  FilePicker,
  FileUpload,
  List,
  ListItem,
  MenuItem,
  NavigationDrawer,
  NumberField,
  NumberInput,
  OneTimeCodeInput,
  RadioButton,
  RadioGroup,
  Search,
  SearchResult,
  Select,
  Slider,
  Snackbar,
  SnackbarHost,
  Switch,
  Tab,
  TabPanel,
  TabView,
  Table,
  Tabs,
  type TanreiEvent,
  type TanreiWords,
  TextField,
  missingWords,
  setWords,
} from '../src/index.ts';

declare function use(...values: unknown[]): void;

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
    <NumberInput label="Scale" name="scale" form="order" noSteppers onInput={(event) => use(event.detail.value satisfies number | null)} onChange={(event) => use(event.currentTarget.value satisfies number | null)} onEntryError={(event) => use(event.detail.text satisfies string)} />
    {/* A native event without one stays React's: the search's input is its synthetic event. */}
    <Search label="Search" onInput={(event) => use(event.nativeEvent, event.currentTarget.value)} onSelect={(event) => use(event.detail.value)}>
      <SearchResult value="/tokens/" headline="Tokens" />
    </Search>
  </>
);

// An event prop is `on` and the event's name in camelCase, as React names its own (`onKeyDown`); the element fires the
// event in lowercase (`expandedchange`), as the platform names its own (`selectionchange`).
export const eventNames = (
  <>
    <NavigationDrawer onExpandedChange={(event) => use(event.detail.expanded satisfies boolean)} onPresentationChange={(event) => use(event.currentTarget)} />
    <Snackbar message="Saved" onExpandedChange={(event) => use(event.detail.expanded satisfies boolean)} />
    <CopyButton text="pnpm add @tanrei/react" label="Copy" onCopied={(event) => use(event.currentTarget.text)} onCopyFailed={(event) => use(event.detail.reason)} />
    <TextField label="Date" type="date" onPickerRequest={(event) => use(event.detail.value satisfies string)} onEntryError={(event) => use(event.detail.text satisfies string)} />
    <Table onSelectionChange={(event) => use(event.currentTarget)} />
    {/* A dialog's `cancel` is the platform's own one-word event. */}
    <Dialog headline="Discard draft?" onCancel={(event) => use(event.currentTarget.open)} />
    {/* @ts-expect-error the event's name is camelCase: onExpandedChange */}
    <NavigationDrawer onExpandedchange={() => use()} />
    {/* @ts-expect-error the event's name is camelCase: onExpandedChange */}
    <Snackbar message="Saved" onExpandedchange={() => use()} />
    {/* @ts-expect-error the event's name is camelCase: onCopyFailed */}
    <CopyButton text="x" onCopyfailed={() => use()} />
    {/* @ts-expect-error the event's name is camelCase: onEntryError */}
    <TextField label="Date" onEntryerror={() => use()} />
    {/* @ts-expect-error the event's name is camelCase: onSelectionChange */}
    <Table onSelectionchange={() => use()} />
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

// The product's words are given through the same package: Tanrei ships none.
const words: TanreiWords = {};
setWords(words);
use(missingWords() satisfies readonly unknown[]);
