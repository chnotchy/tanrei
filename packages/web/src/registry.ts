// What a design system may extend on the web, as open registries: a layer adds a step in a series or a value on a component axis, and never takes one away.
//
// The core values are listed here. A system that adds a Button size or variant ships a generated `.d.ts` that
// augments THIS module — always this path, never a re-export, because TypeScript merges declarations into
// the module that declares them:
//
//   declare module '@tanrei/web/registry' {
//     interface TanreiButtonSizeRegistry { '3x': true }
//   }
export interface TanreiButtonSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiButtonVariantRegistry {
  filled: true;
  tonal: true;
  elevated: true;
  outlined: true;
  text: true;
}

export interface TanreiCardVariantRegistry {
  elevated: true;
  filled: true;
  outlined: true;
}

export interface TanreiProgressIndicatorSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiMeterSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiLoadingIndicatorSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

// The box of the text input, the select, the combobox, the number input and the color input is one set of tokens,
// `comp.input-box`: its sizes and its looks are the box's, and the five controls' `size` and `variant`
// are defined from these two. A layer that adds a size or a look adds it to the box, and all five take it. A control
// offers the sizes its spec lists: the select all three, the four others every one but `small`.
export interface TanreiInputBoxSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiInputBoxVariantRegistry {
  stacked: true;
  filled: true;
  outlined: true;
}

export interface TanreiFabMenuSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiFabMenuVariantRegistry {
  filled: true;
  tonal: true;
  surface: true;
}

export interface TanreiMainActionButtonSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiMainActionButtonVariantRegistry {
  filled: true;
  tonal: true;
  surface: true;
}

export interface TanreiChipSizeRegistry {
  small: true;
  medium: true;
}

export interface TanreiChipVariantRegistry {
  outlined: true;
  elevated: true;
}

export interface TanreiSliderSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiButtonWithMenuSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiButtonWithMenuVariantRegistry {
  filled: true;
  tonal: true;
  elevated: true;
  outlined: true;
}

export interface TanreiKeyboardShortcutSizeRegistry {
  small: true;
  medium: true;
}

export interface TanreiKeyboardShortcutVariantRegistry {
  keycap: true;
  plain: true;
}

export interface TanreiTagSizeRegistry {
  small: true;
  medium: true;
}

export interface TanreiTagVariantRegistry {
  tonal: true;
  outlined: true;
  filled: true;
}

export interface TanreiCalloutSizeRegistry {
  medium: true;
  large: true;
}

export interface TanreiCalloutVariantRegistry {
  tonal: true;
  outlined: true;
}

export interface TanreiEmptyStateSizeRegistry {
  medium: true;
  large: true;
}

export interface TanreiTableDensityRegistry {
  regular: true;
  compact: true;
}

export interface TanreiCodeBlockSizeRegistry {
  small: true;
  medium: true;
}

export interface TanreiCodeBlockVariantRegistry {
  filled: true;
  outlined: true;
}

export interface TanreiDescriptionListDensityRegistry {
  regular: true;
  compact: true;
}

export interface TanreiFigureVariantRegistry {
  outlined: true;
  filled: true;
  plain: true;
}

export interface TanreiLinkCardVariantRegistry {
  outlined: true;
  filled: true;
}

export interface TanreiAccordionVariantRegistry {
  plain: true;
  outlined: true;
}

export interface TanreiAccordionDensityRegistry {
  regular: true;
  compact: true;
}

export interface TanreiTreeViewDensityRegistry {
  regular: true;
  compact: true;
}

export interface TanreiListRowDensityRegistry {
  regular: true;
  compact: true;
}

export interface TanreiPageHeaderSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiTableOfContentsDensityRegistry {
  regular: true;
  compact: true;
}

export interface TanreiFieldGroupSpacingRegistry {
  controls: true;
  fields: true;
}

export interface TanreiTagGroupSpacingRegistry {
  tags: true;
  chips: true;
}

export interface TanreiAvatarSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiAvatarShapeRegistry {
  circle: true;
  square: true;
}

export interface TanreiSwatchSizeRegistry {
  small: true;
  medium: true;
  large: true;
}

export interface TanreiSwatchShapeRegistry {
  square: true;
  circle: true;
}

export interface TanreiTabsVariantRegistry {
  primary: true;
  secondary: true;
  tonal: true;
}

export interface TanreiTabsSizeRegistry {
  small: true;
  medium: true;
}
