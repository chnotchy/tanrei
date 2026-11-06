// The page `reports.test.mjs` drives: wrappers used correctly, the way a React product writes them, which must report
// nothing in a debug build — and one misuse, which is reported. A wrapper sets an element's props as properties once the element is in the document
// (`@lit/react`, in a layout effect, children before their parent), so an option's `value` reaches its attribute — what
// the field reads — only with the option's own update, after the field has read its children and been given its value.
// Bundled by the test with esbuild.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ComboboxField, Option, OptionGroup, Select, SelectField } from '@tanrei/react';
import { Combobox } from '@tanrei/react/advanced';

declare global {
  interface Window {
    /** Gives the second select the other list, and a value from it, in one render. */
    swap: () => void;
  }
}

const FRUIT = [
  { value: 'apple', label: 'Apple' },
  { value: 'pear', label: 'Pear' },
];
const VEGETABLES = [
  { value: 'leek', label: 'Leek' },
  { value: 'kale', label: 'Kale' },
];

function App() {
  const [swapped, setSwapped] = useState(false);
  window.swap = () => setSwapped(true);
  const list = swapped ? VEGETABLES : FRUIT;
  return (
    <>
      <Select id="theme" label="Theme" value="light">
        <Option value="auto">Follow the device</Option>
        <Option value="light">Light</Option>
        <Option value="dark">Dark</Option>
      </Select>
      <Select id="food" label="Food" value={swapped ? 'kale' : 'pear'}>
        {list.map((item) => (
          <Option key={item.value} value={item.value}>
            {item.label}
          </Option>
        ))}
      </Select>
      <Select id="grouped" label="City" value="kyoto">
        <OptionGroup label="Japan">
          <Option value="tokyo">Tokyo</Option>
          <Option value="kyoto">Kyoto</Option>
        </OptionGroup>
        <OptionGroup label="France">
          <Option value="paris">Paris</Option>
        </OptionGroup>
      </Select>
      <Combobox id="country" label="Country" value="jp">
        <Option value="jp">Japan</Option>
        <Option value="fr">France</Option>
      </Combobox>
      {/* The one misuse on the page: a value that names no option, which a debug build reports (SEL-17). */}
      <Select id="unknown" label="Unknown" value="zz">
        <Option value="a">A</Option>
      </Select>
      {/* The options reach the select inside through a slot. */}
      <SelectField id="size" label="Size" value="m">
        <Option value="s">Small</Option>
        <Option value="m">Medium</Option>
      </SelectField>
      <ComboboxField id="port" label="Port" value="osaka">
        <Option value="kobe">Kobe</Option>
        <Option value="osaka">Osaka</Option>
      </ComboboxField>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
