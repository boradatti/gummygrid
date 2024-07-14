import type { GridConfig } from './grid';
import type { Cell, CellCoordinates } from './cell';
import { toTrainCase } from './utils';

type SVGInnerConfig = {
  patternAreaRatio: number;
  backgroundColors: SVGColor[];
  cellFillColors: SVGColor[];
  cellStrokeColors: SVGColor[];
  lockColors: ColorCategory[];
  flow: boolean;
  gutter: number;
  cellRounding: { inner: number; outer: number };
  strokeWidth: number;
  inner: {
    cellSize: number;
    gridSize: Exclude<GridConfig['size'], number>;
    colorIdxPicker: (options: {
      category: ColorCategory;
      colors: SVGColor[];
    }) => number;
  };
};

type SVGCalculatedValues = {
  ptnWidth: number;
  ptnHeight: number;
  backgroundWH: number;
  cellRadius: { outer: number; inner: number };
};

export type SVGConfig = Omit<SVGInnerConfig, 'inner'>;

export class SVG {
  private string: string = '';
  private readonly config: Readonly<SVGInnerConfig>;
  private readonly calculated: Readonly<SVGCalculatedValues>;

  public constructor(config: SVGInnerConfig) {
    this.config = config;
    this.validateConfig();
    this.calculated = this.getCalculatedValues();
  }

  private validateConfig() {
    this.validateCellRounding();
    this.validateColorArrays();
    this.validateLockedColorArrays();
  }

  private validateCellRounding() {
    const { inner, outer } = this.config.cellRounding;
    if (inner < 0 || inner > 1 || outer < 0 || outer > 1)
      throw new Error(
        'Inner and outer rounding should both be numbers between 0 and 1'
      );
  }

  private validateColorArrays() {
    const { backgroundColors, cellFillColors, cellStrokeColors, strokeWidth } =
      this.config;
    if (backgroundColors.length == 0 || cellFillColors.length == 0)
      throw new Error(
        'cellFillColors and backgorundColors must be of length greater than 0'
      );
    if (strokeWidth > 0 && cellStrokeColors.length == 0)
      throw new Error('cellStrokeColors must be of length greater than 0');
    // todo: ensure
  }

  private validateLockedColorArrays() {
    let lockedLength: number;
    const { lockColors } = this.config;
    for (const colorCategory of lockColors) {
      const colors = this.getColorsFromCategory(colorCategory);
      lockedLength ??= colors.length;
      if (colors.length != lockedLength)
        throw new Error(
          `All the color arrays specified in lockColors (${lockColors.join(
            ', '
          )}) must be of equal length`
        );
    }
  }

  private pickColorIdx(category: ColorCategory) {
    const colors = this.getColorsFromCategory(category);
    return this.config.inner.colorIdxPicker({
      category,
      colors,
    });
  }

  private getColorsFromCategory(category: ColorCategory) {
    return this.config[`${category}Colors`];
  }

  private isGradientColor(color: SVGColor): color is SVGGradientColor {
    return typeof color !== 'string';
  }

  private getFormattedCSS(colors: ColorsByCategory): string {
    // const
    const css = `
      :root {
        --color-background: ${
          this.isGradientColor(colors.background)
            ? 'url(#gradient-background)'
            : colors.background
        };
        --color-cell-fill: ${
          this.isGradientColor(colors.cellFill)
            ? 'url(#gradient-cell-fill)'
            : colors.cellFill
        };
        --color-cell-stroke: ${
          this.isGradientColor(colors.cellStroke)
            ? 'url(#gradient-cell-stroke)'
            : colors.cellStroke
        };
        --stroke-width: ${this.config.strokeWidth}px;
        --ptn-width: ${this.calculated.ptnWidth}px;
        --ptn-height: ${this.calculated.ptnHeight}px;
      }
    
      .background {
        width: 100%;
        height: 100%;
        fill: var(--color-background);
      }
    
      .pattern {
        fill: var(--color-cell-fill);
        stroke: var(--color-cell-stroke);
        stroke-width: var(--stroke-width);
        paint-order: stroke;
        filter: drop-shadow(0px 0px 2px #52242d);
        --transform-x: calc((100% - var(--ptn-width) + var(--stroke-width)) / 2);
        --transform-y: calc((100% - var(--ptn-height) + var(--stroke-width)) / 2);
        transform: translate(var(--transform-x), var(--transform-y));
      }
    `;

    return this.formatCSS(css);
  }

  private formatCSS(css: string) {
    return css
      .replace(
        /^(.+)(\{[\s\S]+?\})/gm,
        (_, definition: string, declarations: string) =>
          definition.trim() + declarations.replace(/(\n|^ +)/gm, '')
      )
      .split(/\n+/)
      .map((line) => line.trim())
      .join('')
      .trim();
  }

  private getCalculatedValues() {
    const { rows, columns } = this.config.inner.gridSize;
    const { cellSize } = this.config.inner;
    const { gutter, patternAreaRatio, strokeWidth } = this.config;

    const ptnWidth = cellSize * columns + gutter * (columns - 1) + strokeWidth;
    const ptnHeight = cellSize * rows + gutter * (rows - 1) + strokeWidth;
    const backgroundWH = Math.max(ptnWidth, ptnHeight) / patternAreaRatio;

    const rOuter = (cellSize * this.config.cellRounding.outer) / 2;
    const rInner = (cellSize * this.config.cellRounding.inner) / 2;

    return {
      ptnWidth,
      ptnHeight,
      backgroundWH,
      cellRadius: { outer: rOuter, inner: rInner },
    };
  }

  private isLockedColor(category: ColorCategory) {
    return this.config.lockColors.includes(category);
  }

  private getAllColors(): ColorsByCategory {
    let res = {} as any;

    let lockedIdx: number;
    if (this.config.lockColors.length > 0) {
      const lockedColor = this.config.lockColors[0]!;
      lockedIdx = this.pickColorIdx(lockedColor);
    }

    for (const colorCategory of COLOR_CATEGORIES) {
      const colors = this.getColorsFromCategory(colorCategory);
      if (this.isLockedColor(colorCategory)) {
        res[colorCategory] = colors[lockedIdx!];
      } else {
        res[colorCategory] = colors[this.pickColorIdx(colorCategory)];
      }
    }

    return res as ColorsByCategory;
  }

  private getGradientSVGTags(colors: ColorsByCategory): GradientSVGTagMap {
    const tags: GradientSVGTagMap = {
      background: '',
      cellFill: '',
      cellStroke: '',
    };

    for (const [category, color] of Object.entries(colors)) {
      if (!this.isGradientColor(color)) continue;
      const { type, attrs, stops } = color;
      // @ts-ignore
      tags[category] = this.formatGradientTag({
        tag: type,
        attrs,
        stops,
        // @ts-ignore
        category,
      });
    }

    return tags;
  }

  public buildFrom(cells: Iterable<Cell>) {
    const backgroundWH = this.calculated.backgroundWH.toFixed(2);

    const colors = this.getAllColors();
    console.log('👀👀👀');
    console.log(colors);

    const gradientTags = this.getGradientSVGTags(colors);

    const svgEls: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${backgroundWH}" height="${backgroundWH}" viewbox="0 0 ${backgroundWH} ${backgroundWH}">`,
      `<style>${this.getFormattedCSS(colors)}</style>`,
      `<rect class="background" />`,
      gradientTags.background,
      gradientTags.cellFill,
      gradientTags.cellStroke,
      `<path class="pattern" d="${this.drawCompletePath(cells)}"/>`,
      '</svg>',
    ];

    const svg = svgEls.join('');

    this.string = svg;
  }

  drawCompletePath(cells: Iterable<Cell>) {
    let pathData = '';

    for (const cell of cells) {
      const coords = this.getSVGCellCoordinates(cell);

      if (cell.isFilled()) {
        pathData += this.drawFilledCellPath({ cell, coords });
      } else if (this.canDrawInnerCorner()) {
        pathData += this.drawInnerCornersPath({ cell, coords });
      }
    }

    return pathData;
  }

  canDrawInnerCorner() {
    const roundingInner = this.config.cellRounding.inner;
    const roundingOuter = this.config.cellRounding.outer;
    const roundingsDiffer = this.config.strokeWidth
      ? roundingInner >= roundingOuter
      : roundingInner > roundingOuter;
    return roundingInner && (roundingsDiffer || this.config.flow);
  }

  drawFilledCellPath(options: {
    cell: Cell;
    coords: { x: number; y: number };
  }) {
    const cell = options.cell;
    const { x, y } = options.coords;

    const cellSize = this.config.inner.cellSize;
    const roundingOuter = this.config.cellRounding.outer;
    const rOuter = this.calculated.cellRadius.outer;
    const flow = this.config.flow;

    const hasTopNb = cell.hasFilledNeighbor('TOP');
    const hasBottomNb = cell.hasFilledNeighbor('BOTTOM');
    const hasLeftNb = cell.hasFilledNeighbor('LEFT');
    const hasRightNb = cell.hasFilledNeighbor('RIGHT');
    const hasTopRightNb = cell.hasFilledNeighbor('TOP_RIGHT');
    const hasTopLeftNb = cell.hasFilledNeighbor('TOP_LEFT');
    const hasBottomRightNb = cell.hasFilledNeighbor('BOTTOM_RIGHT');
    const hasBottomLeftNb = cell.hasFilledNeighbor('BOTTOM_LEFT');

    let pathData = `M ${x} ${y + cellSize / 2} `;

    if (roundingOuter < 1) {
      pathData += `L ${x} ${y + rOuter} `;
    }

    if (roundingOuter) {
      if (flow && (hasLeftNb || hasTopNb || hasTopLeftNb)) {
        pathData += `L ${x} ${y} `;
        pathData += `L ${x + rOuter} ${y} `;
      } else {
        pathData += `A ${rOuter} ${rOuter} 0 0 1 ${x + rOuter} ${y} `;
      }
    }

    if (roundingOuter < 1) {
      pathData += `L ${x + cellSize - rOuter} ${y} `;
    }

    if (roundingOuter) {
      if (flow && (hasRightNb || hasTopNb || hasTopRightNb)) {
        pathData += `L ${x + cellSize} ${y} `;
        pathData += `L ${x + cellSize} ${y + rOuter} `;
      } else {
        pathData += `A ${rOuter} ${rOuter} 0 0 1 ${x + cellSize} ${
          y + rOuter
        } `;
      }
    }

    if (roundingOuter < 1) {
      pathData += `L ${x + cellSize} ${y + cellSize - rOuter} `;
    }

    if (roundingOuter) {
      if (flow && (hasRightNb || hasBottomNb || hasBottomRightNb)) {
        pathData += `L ${x + cellSize} ${y + cellSize} `;
        pathData += `L ${x + cellSize - rOuter} ${y + cellSize} `;
      } else {
        pathData += `A ${rOuter} ${rOuter} 0 0 1 ${x + cellSize - rOuter} ${
          y + cellSize
        } `;
      }
    }

    if (roundingOuter < 1) {
      pathData += `L ${x + rOuter} ${y + cellSize} `;
    }

    if (roundingOuter) {
      if (flow && (hasLeftNb || hasBottomNb || hasBottomLeftNb)) {
        pathData += `L ${x} ${y + cellSize} `;
        pathData += `L ${x} ${y + cellSize - rOuter} `;
      } else {
        pathData += `A ${rOuter} ${rOuter} 0 0 1 ${x} ${
          y + cellSize - rOuter
        } `;
      }
    }

    if (roundingOuter < 1) {
      pathData += `L ${x} ${y + cellSize / 2} `;
    }

    pathData += 'Z ';

    return pathData;
  }

  drawInnerCornersPath(options: {
    cell: Cell;
    coords: { x: number; y: number };
  }) {
    const cell = options.cell;
    const { x, y } = options.coords;

    const cellSize = this.config.inner.cellSize;
    const rInner = this.calculated.cellRadius.inner;
    const rOuter = this.calculated.cellRadius.outer;
    const flow = this.config.flow;

    const hasTopNb = cell.hasFilledNeighbor('TOP');
    const hasBottomNb = cell.hasFilledNeighbor('BOTTOM');
    const hasLeftNb = cell.hasFilledNeighbor('LEFT');
    const hasRightNb = cell.hasFilledNeighbor('RIGHT');

    let pathData = '';

    if (hasTopNb && hasLeftNb) {
      pathData += `M ${x} ${y + rInner} `;
      pathData += `A ${rInner} ${rInner} 0 0 1 ${x + rInner} ${y} `;
      pathData += `L ${x + rOuter} ${y} `;
      if (flow) {
        pathData += `L ${x} ${y} `;
        pathData += `L ${x} ${y + rOuter} `;
      } else if (rOuter) {
        pathData += `A ${rOuter} ${rOuter} 0 0 0 ${x} ${y + rOuter} `;
      }
      pathData += `L ${x} ${y + rInner} `;
      pathData += 'Z ';
    }

    if (hasTopNb && hasRightNb) {
      pathData += `M ${x + cellSize - rInner} ${y} `;
      pathData += `A ${rInner} ${rInner} 0 0 1 ${x + cellSize} ${y + rInner} `;
      pathData += `L ${x + cellSize} ${y + rOuter} `;
      if (flow) {
        pathData += `L ${x + cellSize} ${y} `;
        pathData += `L ${x + cellSize - rOuter} ${y} `;
      } else if (rOuter) {
        pathData += `A ${rOuter} ${rOuter} 0 0 0 ${
          x + cellSize - rOuter
        } ${y} `;
      }
      pathData += `L ${x + cellSize - rInner} ${y} `;
      pathData += 'Z ';
    }

    if (hasBottomNb && hasRightNb) {
      pathData += `M ${x + cellSize} ${y + cellSize - rInner} `;
      pathData += `A ${rInner} ${rInner} 0 0 1 ${x + cellSize - rInner} ${
        y + cellSize
      } `;
      pathData += `L ${x + cellSize - rOuter} ${y + cellSize} `;
      if (flow) {
        pathData += `L ${x + cellSize} ${y + cellSize} `;
        pathData += `L ${x + cellSize} ${y + cellSize - rOuter} `;
      } else if (rOuter) {
        pathData += `A ${rOuter} ${rOuter} 0 0 0 ${x + cellSize} ${
          y + cellSize - rOuter
        } `;
      }
      pathData += `L ${x + cellSize} ${y + cellSize - rInner} `;
      pathData += 'Z ';
    }

    if (hasBottomNb && hasLeftNb) {
      pathData += `M ${x + rInner} ${y + cellSize} `;
      pathData += `A ${rInner} ${rInner} 0 0 1 ${x} ${y + cellSize - rInner} `;
      pathData += `L ${x} ${y + cellSize - rOuter} `;
      if (flow) {
        pathData += `L ${x} ${y + cellSize} `;
        pathData += `L ${x + rOuter} ${y + cellSize} `;
      } else if (rOuter) {
        pathData += `A ${rOuter} ${rOuter} 0 0 0 ${x + rOuter} ${
          y + cellSize
        } `;
      }
      pathData += `L ${x + rInner} ${y + cellSize} `;
      pathData += 'Z ';
    }

    return pathData;
  }

  public toString() {
    return this.string;
  }

  public toURLEncodedString(
    options: { withPrefix: boolean } = { withPrefix: false }
  ) {
    const encodedString = encodeURIComponent(this.string);
    if (options.withPrefix) {
      return `data:image/svg+xml;charset=utf-8,${encodedString}`;
    } else {
      return encodedString;
    }
  }

  private getSVGCellCoordinates(coord: CellCoordinates) {
    return {
      x: coord.col * (this.config.inner.cellSize + this.config.gutter),
      y: coord.row * (this.config.inner.cellSize + this.config.gutter),
    };
  }

  private formatGradientTag(options: {
    tag: SVGGradientTag;
    attrs: Record<any, any>;
    stops: Array<Stop>;
    category: ColorCategory;
  }): string {
    const { tag, attrs, stops, category } = options;
    let svg = `<${tag} id="gradient-${toTrainCase(category)}" `;
    for (const [key, value] of Object.entries(attrs))
      svg += `${key}="${value}" `;
    svg += '>';
    for (const stop of stops) {
      svg += '<stop ';
      for (const [key, value] of Object.entries(stop))
        svg += `${toTrainCase(key)}="${value}" `;
      svg += '/>';
    }
    return svg + `</${tag}>`;
  }
}

type SVGGradientTag = 'radialGradient' | 'linearGradient';

type SVGLinearGradientAttributes = {
  x1?: string;
  x2?: string;
  y1?: string;
  y2?: string;
  gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  gradientTransform?: string;
  spreadMethod?: 'pad' | 'reflect' | 'repeat';
  href?: string;
};

type SVGRadialGradientAttributes = {
  cx?: string;
  cy?: string;
  r?: string;
  fx?: string;
  fy?: string;
  fr?: string | 'userSpaceOnUse' | 'objectBoundingBox';
  transform?: string;
  href?: string;
  r2: string;
  spreadMethod?: 'pad' | 'reflect' | 'repeat';
};

type SVGColor =
  | string
  | {
      type: 'linearGradient';
      attrs: SVGLinearGradientAttributes;
      stops: Array<Stop>;
    }
  | {
      type: 'radialGradient';
      attrs: SVGRadialGradientAttributes;
      stops: Array<Stop>;
    };

type SVGGradientColor = Exclude<SVGColor, string>;

const COLOR_CATEGORIES = ['background', 'cellFill', 'cellStroke'] as const;

export type ColorCategory = (typeof COLOR_CATEGORIES)[number];

type ColorsByCategory = { [K in ColorCategory]: SVGColor };

type Stop = {
  offset: number | `${number}%`;
  stopColor: string;
  stopOpacity: number;
};

type GradientSVGTagMap = Record<ColorCategory, string>;
