import type { GridConfig } from './grid';
import type { Cell, CellCoordinates } from './cell';
import { isEmptyObject, toTrainCase } from './utils';

type SVGInnerConfig = {
  patternAreaRatio: number;
  colors: {
    background: SVGColor[];
    cellFill: SVGColor[];
    cellStroke?: SVGColor[];
    dropShadow?: string[];
  };
  lockColors: ColorCategory[] | 'all';
  flow: boolean;
  gutter: number;
  cellRounding: { inner: number; outer: number };
  strokeWidth: number;
  paintOrder: 'stroke' | 'normal';
  strokeLineJoin: 'miter' | 'miter-clip' | 'round' | 'bevel' | 'arcs';
  filters: {
    blur?: string;
    brightness?: string;
    contrast?: string;
    dropShadow?: [string, string, string];
    grayscale?: string;
    hueRotate?: string;
    invert?: string;
    opacity?: string;
    saturate?: string;
    sepia?: string;
  };
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
    const { colors, strokeWidth } = this.config;
    if (colors.background.length == 0 || colors.cellFill.length == 0)
      throw new Error(
        'colors.cellFill and colors.background must be of length greater than 0'
      );
    if (strokeWidth > 0 && colors.cellStroke?.length == 0)
      throw new Error(
        "colors.cellStroke must be of length greater than 0, or strokeWidth shouldn't be specified"
      );
    if ('dropShadow' in this.config.filters && colors.dropShadow?.length == 0) {
      throw new Error(
        "colors.dropShadow must be of length greater than 0, or filters.dropShadow shouldn't be specified"
      );
    } else if (
      colors.dropShadow?.length &&
      !('dropShadow' in this.config.filters)
    ) {
      throw new Error(
        "filers.dropShadow must be specified, or colors.dropShadow shouldn't be specified"
      );
    }
  }

  private validateLockedColorArrays() {
    let lockedLength: number;
    const lockColors = this.getLockedColors();
    for (const colorCategory of lockColors) {
      const colors = this.getColorsFromCategory(colorCategory);
      lockedLength ??= colors.length;
      if (colors.length != lockedLength)
        throw new Error(
          `All the color arrays specified in lockColors (${lockColors.join(
            ', '
          )}) must be be specified and have equal length`
        );
    }
  }

  private getLockedColors(): ColorCategory[] {
    if (this.config.lockColors == 'all') {
      return this.colorCategories;
    } else {
      return this.config.lockColors;
    }
  }

  private pickColorIdx(category: ColorCategory) {
    const colors = this.getColorsFromCategory(category);
    console.log({ colors });
    return this.config.inner.colorIdxPicker({
      category,
      colors,
    });
  }

  private getColorsFromCategory(category: ColorCategory) {
    return this.config.colors[category] ?? [];
  }

  private hasColorsInCategory(category: ColorCategory) {
    return this.getColorsFromCategory(category).length > 0;
  }

  private isGradientColor(color: SVGColor): color is SVGGradientColor {
    return typeof color !== 'string';
  }

  private formatCSS(colors: ColorsByCategory): string {
    console.log('📞 getFormattedCSS');
    console.log({ colors });
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
        ${this.formatCSSDropShadow(colors.dropShadow as string)}
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
        stroke-linejoin: ${this.config.strokeLineJoin};
        paint-order: ${this.config.paintOrder};
        ${this.formatCSSFiltersDeclaration()}
        --transform-x: calc((100% - var(--ptn-width) + var(--stroke-width)) / 2);
        --transform-y: calc((100% - var(--ptn-height) + var(--stroke-width)) / 2);
        transform: translate(var(--transform-x), var(--transform-y));
      }
    `;

    console.log('🧐', this.formatCSSFiltersDeclaration());

    return this.compressCSS(css);
  }

  private compressCSS(css: string) {
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

  private formatCSSDropShadow(dropShadowColor: string) {
    console.log('📞 formatCSSDropShadow');
    console.log({ dropShadowColor });
    if (!dropShadowColor) return ''; // todo: revise
    return `--color-cell-drop-shadow: ${dropShadowColor};`;
  }

  private formatCSSFiltersDeclaration() {
    if (!this.hasFilters()) return '';
    const values = [];
    for (const [key, value] of Object.entries(this.config.filters)) {
      const func = toTrainCase(key);
      if (key == 'dropShadow') {
        const v = [...value, 'var(--color-cell-drop-shadow)'].join(' ');
        values.push(`${func}(${v})`);
      } else {
        values.push(`${func}(${value})`);
      }
    }
    return `filter: ${values.join(' ')};`;
  }

  private hasFilters() {
    return !isEmptyObject(this.config.filters);
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
    console.log({ rOuter, rInner });

    return {
      ptnWidth,
      ptnHeight,
      backgroundWH,
      cellRadius: { outer: rOuter, inner: rInner },
    };
  }

  private isLockedColor(category: ColorCategory) {
    return (
      this.config.lockColors == 'all' ||
      this.config.lockColors.includes(category)
    );
  }

  private getAllColors(): ColorsByCategory {
    let res = {} as any;

    const lockedColors = this.getLockedColors();
    console.log({ lockedColors });
    let lockedIdx: number;
    if (lockedColors.length) {
      const lockedColor = lockedColors[0]!;
      lockedIdx = this.pickColorIdx(lockedColor);
    }

    for (const category of this.colorCategories) {
      const colors = this.getColorsFromCategory(category);
      if (this.isLockedColor(category)) {
        console.log(category, 'is locked,', lockedIdx!);
        res[category] = colors[lockedIdx!];
      } else if (this.hasColorsInCategory(category)) {
        res[category] = colors[this.pickColorIdx(category)];
      }
    }

    return res as ColorsByCategory;
  }

  private getGradientSVGTags(colors: ColorsByCategory): GradientSVGTagMap {
    const tags: GradientSVGTagMap = {
      background: '',
      cellFill: '',
      cellStroke: '',
      dropShadow: '',
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
      `<style>${this.formatCSS(colors)}</style>`,
      gradientTags.background,
      gradientTags.cellFill,
      gradientTags.cellStroke,
      `<rect class="background" />`,
      `<path class="pattern" d="${this.drawCompletePath(cells)}" />`,
      '</svg>',
    ];

    const svg = svgEls.join('');

    this.string = svg;
  }

  drawCompletePath(cells: Iterable<Cell>) {
    let pathData = '';

    for (const cell of cells) {
      const coords = this.getRawCellCoordinates(cell);

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

  private getRawCellCoordinates(coord: CellCoordinates) {
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
      svg += `<stop offset="${stop.offset}" stop-color="${
        stop.color
      }" stop-opacity="${stop.opacity ?? 1}" />`;
      svg += '';
    }
    return svg + `</${tag}>`;
  }

  private get colorCategories() {
    return Object.keys(this.config.colors) as ColorCategory[];
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

export type SVGColor =
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

export type ColorCategory = keyof SVGConfig['colors'];

type ColorsByCategory = { [K in ColorCategory]: SVGColor };

type Stop = {
  offset: number | `${number}%`;
  color: string;
  opacity?: number;
};

type GradientSVGTagMap = Record<ColorCategory, string>;
