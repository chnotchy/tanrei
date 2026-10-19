import { type CSSResult, type TemplateResult, html, nothing, svg, unsafeCSS } from 'lit';

// The arrow of a surface that points at its anchor (a tooltip's, TIP-25; a popover's, POP-10): a triangle on the edge
// that faces the anchor, in the surface's color, drawn as ONE shape with it — the elevation's ring and shadows run
// round both, with no seam and no shadow between the two. A `box-shadow` cannot do that (each box casts its own), so
// while an arrow is drawn the painted box gives up its shadow and the same layers are drawn by an SVG filter over the
// box and the arrow together.
//
// The markup the styles expect, inside the placed box (`surface`), which the filter is set on (`shadeOn()`):
//
//   <div class="motion">                         what fades and grows (its own filter is the appearance's blur)
//     <span class="arrow" aria-hidden="true">    the triangle
//     <div class="…">                            the painted box (`box`)
//   </div>
//   <span class="shade" aria-hidden="true">      never drawn: the elevation as the browser resolves it, read by script
//   ${shadeFilter(layers)}                       the filter made from it
//
// and on the placed box, written by the script that places it: `data-side` (top, bottom, left, right: the side of the
// anchor it stands on), `data-arrow` (`shaded` or `flat` while an arrow is drawn, absent otherwise) and `--_arrow-at`
// (where the tip is, from the box's left edge above or below the anchor, from its top edge beside it).

/** One layer of a `box-shadow`, as the browser resolves it. */
export interface ShadowLayer {
  color: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
}

/** A resolved `box-shadow` as its outer layers that draw something (an inset layer is the box's own). */
export function shadowLayers(value: string): ShadowLayer[] {
  if (!value || value === 'none') return [];
  const layers: ShadowLayer[] = [];
  // Split at the commas between layers, not those inside a color function.
  for (const layer of value.split(/,(?![^(]*\))/)) {
    const color = /[a-z-]+\([^)]*\)|#[0-9a-f]+/i.exec(layer)?.[0] ?? layer.trim().split(/\s+/).find((word) => /^[a-z]+$/i.test(word) && word !== 'inset') ?? '';
    const [x = 0, y = 0, blur = 0, spread = 0] = (layer.replace(color, ' ').match(/-?[\d.]+(?:e-?\d+)?px|(?<![\w.])0(?![\w.])/g) ?? []).map((length) => Number.parseFloat(length));
    // No alpha at all: `transparent`, a fourth component of 0 (`rgba(0, 0, 0, 0)`) or one after a slash (`color(srgb 0 0 0 / 0)`).
    const clear = color === 'transparent' || /^[a-z-]+\((?:[^,]+,){3}\s*0(?:\.0+)?%?\s*\)$/i.test(color) || /\/\s*0(?:\.0+)?%?\s*\)$/.test(color);
    if (/\binset\b/.test(layer) || clear || !color || (x === 0 && y === 0 && blur === 0 && spread <= 0)) continue;
    layers.push({ color, x, y, blur, spread });
  }
  return layers;
}

/**
 * The elevation as a filter over the box and its arrow together, so that its ring and its shadows run round the one
 * shape: each layer is the shape grown by the layer's spread, blurred, moved and colored, and cut where the shape
 * itself is — what `box-shadow` draws round a box. Nothing while there is no layer.
 */
export function shadeFilter(layers: readonly ShadowLayer[]): TemplateResult | typeof nothing {
  if (!layers.length) return nothing;
  const under = [...layers].reverse();
  return html`<svg class="shade-filter" aria-hidden="true" focusable="false">
      <filter id="shade" x="-100%" y="-400%" width="300%" height="900%" color-interpolation-filters="sRGB">
        ${under.map(
          (layer, i) => svg`
            ${layer.spread ? svg`<feMorphology in="SourceAlpha" operator=${layer.spread < 0 ? 'erode' : 'dilate'} radius=${Math.abs(layer.spread)} result="grown" />` : nothing}
            <feGaussianBlur in=${layer.spread ? 'grown' : 'SourceAlpha'} stdDeviation=${layer.blur / 2} />
            <feOffset dx=${layer.x} dy=${layer.y} result="cast" />
            <feFlood style="flood-color: ${layer.color}" />
            <feComposite in2="cast" operator="in" />
            <feComposite in2="SourceAlpha" operator="out" result=${`layer${i}`} />`,
        )}
        <feMerge>
          ${under.map((_, i) => svg`<feMergeNode in=${`layer${i}`} />`)}
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </svg>`;
}

/**
 * Sets the elevation's filter on the placed box while its arrow is shaded (`data-arrow='shaded'`), and takes it off
 * otherwise. On the placed box, not on what moves inside it: there the filter is the appearance's blur
 * (`appearStyles()`, src/primitives/motion.ts), and an inline filter would hold it. The filter is drawn round what the
 * box holds as it is drawn — faded and grown with it. It is named from the element's own style, so that the name is
 * looked up in its shadow root.
 */
export function shadeOn(surface: HTMLElement): void {
  const filter = surface.dataset.arrow === 'shaded' ? 'url(#shade)' : '';
  if (surface.style.filter !== filter) surface.style.filter = filter;
}

/** What `arrowStyles()` is told: the selectors of the markup above, and the values the arrow is drawn from. */
export interface ArrowStyleOptions {
  /** The placed box, which carries `data-side`, `data-arrow` and `--_arrow-at`. */
  surface: string;
  /** The painted box inside it, which gives up its own shadow while an arrow is shaded. */
  box: string;
  /** The arrow's base and height, as CSS length expressions (the component's tokens). */
  width: string;
  height: string;
  /** The arrow's color and the elevation, as CSS expressions: the painted box's own. */
  fill: string;
  elevation: string;
}

/**
 * The arrow's rules: the triangle on the edge that faces the anchor, its tip where the script says, reaching under the
 * painted box by its own height so that no line shows between the two (the box is drawn over that part); and the
 * elevation as the browser resolves it (`.shade`), read by script to make the filter that goes round both.
 */
export function arrowStyles({ surface, box, width, height, fill, elevation }: ArrowStyleOptions): CSSResult {
  return unsafeCSS(`
  .arrow {
    display: none;
    position: absolute;
    background: ${fill};
    --_w: ${width};
    --_h: ${height};
  }
  ${surface}[data-arrow] .arrow {
    display: block;
  }
  /* Above the anchor: under the box's bottom edge, pointing down. */
  ${surface}[data-side='top'] .arrow {
    inline-size: var(--_w);
    block-size: calc(2 * var(--_h));
    left: calc(var(--_arrow-at) - var(--_w) / 2);
    top: calc(100% - var(--_h));
    clip-path: polygon(0 0, 100% 0, 100% 50%, 50% 100%, 0 50%);
  }
  ${surface}[data-side='bottom'] .arrow {
    inline-size: var(--_w);
    block-size: calc(2 * var(--_h));
    left: calc(var(--_arrow-at) - var(--_w) / 2);
    top: calc(-1 * var(--_h));
    clip-path: polygon(50% 0, 100% 50%, 100% 100%, 0 100%, 0 50%);
  }
  /* At the anchor's left: on the box's right edge, pointing right. */
  ${surface}[data-side='left'] .arrow {
    inline-size: calc(2 * var(--_h));
    block-size: var(--_w);
    left: calc(100% - var(--_h));
    top: calc(var(--_arrow-at) - var(--_w) / 2);
    clip-path: polygon(0 0, 50% 0, 100% 50%, 50% 100%, 0 100%);
  }
  ${surface}[data-side='right'] .arrow {
    inline-size: calc(2 * var(--_h));
    block-size: var(--_w);
    left: calc(-1 * var(--_h));
    top: calc(var(--_arrow-at) - var(--_w) / 2);
    clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%, 0 50%);
  }
  /* One shape, one elevation: the box gives up its own shadow for the filter that goes round both. */
  ${surface}[data-arrow='shaded'] ${box} {
    box-shadow: none;
  }
  /* The elevation as the browser resolves it, read by script to make that filter; and the filter. Neither draws. */
  .shade {
    display: none;
    box-shadow: ${elevation};
  }
  .shade-filter {
    position: absolute;
    inline-size: 0;
    block-size: 0;
  }
`);
}

/**
 * The arrow where a person's own colors are forced (POP-32): the mode removes the shadow, so the painted box draws an
 * edge in the text color (the component's own rule) and the arrow continues it as one outline — the triangle in the text
 * color, with the same triangle in the page's color laid over it, moved towards the box by `edge`, so that two strokes
 * are left along the arrow's sides and the box's edge is covered where the arrow stands. `edge` is a CSS length
 * expression: how far the inner triangle is moved (a stroke along a side is thinner than that by the side's slope).
 */
export function arrowOutlineStyles({ surface, edge }: { surface: string; edge: string }): CSSResult {
  return unsafeCSS(`
  @media (forced-colors: active) {
    .arrow {
      z-index: 1;
      background: CanvasText;
      --_e: ${edge};
    }
    .arrow::after {
      content: '';
      position: absolute;
      inset: 0;
      background: Canvas;
    }
    ${surface}[data-side='top'] .arrow {
      clip-path: polygon(0 calc(50% - var(--_e)), 100% calc(50% - var(--_e)), 100% 50%, 50% 100%, 0 50%);
    }
    ${surface}[data-side='top'] .arrow::after {
      clip-path: polygon(0 50%, 100% 50%, 50% 100%);
      translate: 0 calc(-1 * var(--_e));
    }
    ${surface}[data-side='bottom'] .arrow {
      clip-path: polygon(50% 0, 100% 50%, 100% calc(50% + var(--_e)), 0 calc(50% + var(--_e)), 0 50%);
    }
    ${surface}[data-side='bottom'] .arrow::after {
      clip-path: polygon(50% 0, 100% 50%, 0 50%);
      translate: 0 var(--_e);
    }
    ${surface}[data-side='left'] .arrow {
      clip-path: polygon(calc(50% - var(--_e)) 0, 50% 0, 100% 50%, 50% 100%, calc(50% - var(--_e)) 100%);
    }
    ${surface}[data-side='left'] .arrow::after {
      clip-path: polygon(50% 0, 100% 50%, 50% 100%);
      translate: calc(-1 * var(--_e)) 0;
    }
    ${surface}[data-side='right'] .arrow {
      clip-path: polygon(calc(50% + var(--_e)) 0, 50% 0, 0 50%, 50% 100%, calc(50% + var(--_e)) 100%);
    }
    ${surface}[data-side='right'] .arrow::after {
      clip-path: polygon(50% 0, 0 50%, 50% 100%);
      translate: var(--_e) 0;
    }
  }
`);
}
