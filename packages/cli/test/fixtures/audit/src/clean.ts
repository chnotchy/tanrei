import { css, html } from 'lit';
import '@tanrei/web';

// Every component here is the default system's, with a variant it offers.
export const styles = css`
  tanrei-card { display: block; }
`;
export const view = html`
  <!-- <tanrei-carousel></tanrei-carousel> -->
  <tanrei-card variant="outlined">
    <tanrei-button variant="${'text'}">More</tanrei-button>
    <tanrei-tabs variant="secondary"><tanrei-tab label="One"></tanrei-tab></tanrei-tabs>
  </tanrei-card>
`;
