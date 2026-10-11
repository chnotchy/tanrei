// TextField as the test harness sees it (src/testing/harness.tsx): the one place its tests say how spec props become a
// <TextField>. A fixture's `content` names its icons (`leading-icon=<glyph> trailing-icon=<glyph>`); it
// arrives here as `children` and becomes the `leadingIcon` / `trailingIcon` glyphs.
import { defineSubject } from '../../testing/harness';
import { TextField, type TextFieldProps } from '../TextField';

/** `leading-icon=search trailing-icon=close` → `{ leadingIcon: 'search', trailingIcon: 'close' }`. */
export function iconSlots(content: string | undefined): Pick<TextFieldProps, 'leadingIcon' | 'trailingIcon'> {
  const slots: Pick<TextFieldProps, 'leadingIcon' | 'trailingIcon'> = {};
  for (const pair of (content ?? '').split(/\s+/).filter(Boolean)) {
    const [slot, glyph] = pair.split('=');
    if (slot === 'leading-icon') slots.leadingIcon = glyph;
    if (slot === 'trailing-icon') slots.trailingIcon = glyph;
  }
  return slots;
}

export const textFieldSubject = defineSubject<TextFieldProps & { children?: string }>({
  component: 'TextField',
  spec: 'text-field',
  tokens: 'textField',
  render: ({ children, ...props }) => <TextField {...props} {...iconSlots(children)} />,
  axes: { size: 'sizes', variant: 'variants' },
});
