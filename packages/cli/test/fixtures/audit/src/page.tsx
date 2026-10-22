// A <tanrei-fab-menu> named in a comment is not code, nor is an import in one:
/* import '@tanrei/web/m3-like'; */
import '@tanrei/web/m3-like';
import { Button, FabMenu, TextField as Field } from '@tanrei/react';
import { Chip } from '@tanrei/react/all';

const home = 'https://example.com/'; // a URL in a string starts no comment
const trailing = /\/*$/; // nor does a regular expression

export function Page() {
  return (
    <>
      {/* <tanrei-segmented-button></tanrei-segmented-button> */}
      <Field variant="outlined" label="Email" />
      <tanrei-fab-menu label="Create">
        <tanrei-fab-menu-item label="Upload" icon="upload"></tanrei-fab-menu-item>
      </tanrei-fab-menu>
      <p>Don't miss it: https://example.com</p>
      <Button variant="filled">Go</Button>
      <Chip>{home}{String(trailing)}</Chip>
      <tanrei-tabs variant="tonal"></tanrei-tabs>
      <tanrei-widget></tanrei-widget>
    </>
  );
}
