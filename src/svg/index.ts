let fs: typeof import('fs');

import type Cell from '@/grid/cell';
import type { CellCoordinates } from '@/grid/cell/types';
import { SVG_DATA_PREFIX } from './constants';
import {
  ColorCategory,
  ColorsByCategory,
  GradientSVGTagMap,
  SVGCalculatedValues,
  SVGColor,
  SVGGradientColor,
  SVGGradientTag,
  SVGInnerConfig,
  Stop,
} from './types';
import { isEmptyObject, toTrainCase } from './utils';

class SVG {
  private string: string = '';
  private readonly config: Readonly<SVGInnerConfig>;
  private readonly calculated: Readonly<SVGCalculatedValues>;

  constructor(config: SVGInnerConfig) {
    this.config = config;
    this.validateConfig();
    this.calculated = this.getCalculatedValues();
  }

  buildFrom(cells: Iterable<Cell>) {
    const backgroundWH = this.calculated.backgroundWH.toFixed(2);
    const colors = this.getAllColors();
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

  toString() {
    return this.string;
  }

  toURLEncodedString(options: { withPrefix: boolean } = { withPrefix: false }) {
    const encodedString = encodeURIComponent(this.string);
    if (options.withPrefix) {
      return `data:${SVG_DATA_PREFIX},${encodedString}`;
    } else {
      return encodedString;
    }
  }

  toBlob() {
    return new Blob([this.toString()], { type: SVG_DATA_PREFIX });
  }

  getLockedColors(): ColorCategory[] {
    if (this.config.lockColors == 'all') {
      return this.colorCategories;
    } else {
      return this.config.lockColors;
    }
  }

  async toBuffer() {
    return Buffer.from(this.toString());
  }

  async writeFile(filename: string) {
    if (typeof window !== 'undefined') {
      this.writeFileInBrowser(filename);
    } else if (typeof require !== 'undefined') {
      await this.writeFileInNode(filename);
    }
  }

  private async writeFileInNode(filename: string) {
    fs ??= await import('fs');
    fs.writeFileSync(`${filename.replace(/\.svg$/, '')}.svg`, this.toString());
  }

  private writeFileInBrowser(filename: string) {
    const blob = this.toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${filename.replace(/\.svg$/, '')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    const { colors, strokeWidth, filters } = this.config;
    if (colors.background?.length == 0 || colors.cellFill?.length == 0)
      throw new Error(
        'colors.cellFill and colors.background must be arrays of length greater than 0'
      );
    if (strokeWidth > 0 && colors.cellStroke?.length == 0) {
      console.log(
        "⚠️  strokeWidth won't have any effect if colors.cellStroke is not specified"
      );
    }
    if (!strokeWidth && colors.cellStroke?.length) {
      console.log(
        "⚠️  colors.cellStroke won't have any effect if strokeWidth is 0 or unspecified"
      );
    }
    if ('dropShadow' in filters && colors.dropShadow?.length == 0) {
      console.log(
        "⚠️  filters.dropShadow won't have any effect if colors.dropShadow is not specified"
      );
    } else if (colors.dropShadow?.length && !('dropShadow' in filters)) {
      console.log(
        "⚠️  colors.dropShadow won't have any effect if filters.dropShadow is not specified"
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

  private pickColorIdx(category: ColorCategory) {
    const colors = this.getColorsFromCategory(category);

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
    if (!dropShadowColor) return '';
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

    let lockedIdx: number;
    if (lockedColors.length) {
      const lockedColor = lockedColors[0]!;
      lockedIdx = this.pickColorIdx(lockedColor);
    }

    for (const category of this.colorCategories) {
      const colors = this.getColorsFromCategory(category);
      if (this.isLockedColor(category)) {
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

  private drawCompletePath(cells: Iterable<Cell>) {
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

  private canDrawInnerCorner() {
    const roundingInner = this.config.cellRounding.inner;
    const roundingOuter = this.config.cellRounding.outer;
    const roundingsDiffer = this.config.strokeWidth
      ? roundingInner >= roundingOuter
      : roundingInner > roundingOuter;
    return roundingInner && (roundingsDiffer || this.config.flow);
  }

  private drawFilledCellPath(options: {
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

  private drawInnerCornersPath(options: {
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

export default SVG;
