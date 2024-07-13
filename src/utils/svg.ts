import type { GridConfig } from './grid';
import type {
  Cell,
  CellEdgeOrientation,
  CellCoordinates,
  CellNeighborDirection,
} from './cell';

type SVGInnerConfig = {
  backgroundColor: string;
  patternAreaRatio: number;
  cellColors: string[];
  flow: boolean;
  gutter: number;
  cellRounding: { inner: number; outer: number };
  strokeWidth: number;
  inner: {
    cellSize: number;
    gridSize: Exclude<GridConfig['size'], number>;
    cellColorPicker: (colors: string[]) => string;
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
    this.validateConfig(config);
    this.config = config;
    this.calculated = this.getCalculatedValues();
  }

  private validateConfig(config: SVGInnerConfig) {
    const { inner, outer } = config.cellRounding;
    if (inner < 0 || inner > 1 || outer < 0 || outer > 1)
      throw new Error(
        'Inner and outer rounding should both be numbers between 0 and 1'
      );
  }

  private pickCellColor() {
    return this.config.inner.cellColorPicker(this.config.cellColors);
  }

  private getFormattedCSS(): string {
    // todo: implement color logic
    const css = `
    :root {
      --color-background: ${false ? 'url(#gradient-background)' : 'black'};
      --color-cell-fill: ${false ? 'url(#gradient-fill)' : 'red'};
      --color-cell-stroke: ${false ? 'url(#gradient-stroke)' : 'yellow'};
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
      .join('')
      .trim();
  }

  private needsInnerRounding(): boolean {
    return this.config.cellRounding.inner > 0;
  }

  private hasGutter(): boolean {
    return this.config.gutter > 0;
  }

  private getFilledCellDiv(
    cell: Cell,
    coords: { x: number; y: number }
  ): string {
    return [
      `<g class="filled" style="--cell-x: ${coords.x}px; --cell-y: ${coords.y}px;">`,
      '<rect class="cell"/>',
      this.getFormattedEdgesAndCorners(cell),
      '</g>',
    ].join('');
  }

  private getEmptyCellCornersAndEdges(cell: Cell): string {
    const els: string[] = [];

    if (cell.hasFilledNeighbor('TOP') && cell.hasFilledNeighbor('LEFT')) {
      els.push('<rect class="cell-corner cell-corner-top-left"/>');
      if (!this.hasGutter() && this.needsConnectedCorners()) {
        els.push('<rect class="edge edge-horizontal-top-left"/>');
        els.push('<rect class="edge edge-vertical-top-left"/>');
      }
    }

    if (cell.hasFilledNeighbor('TOP') && cell.hasFilledNeighbor('RIGHT')) {
      els.push('<rect class="cell-corner cell-corner-top-right"/>');
      if (!this.hasGutter() && this.needsConnectedCorners()) {
        els.push('<rect class="edge edge-horizontal-top-right"/>');
        els.push('<rect class="edge edge-vertical-top-right"/>');
      }
    }

    if (cell.hasFilledNeighbor('BOTTOM') && cell.hasFilledNeighbor('LEFT')) {
      els.push('<rect class="cell-corner cell-corner-bottom-left"/>');
      if (!this.hasGutter() && this.needsConnectedCorners()) {
        els.push('<rect class="edge edge-horizontal-bottom-left"/>');
        els.push('<rect class="edge edge-vertical-bottom-left"/>');
      }
    }

    if (cell.hasFilledNeighbor('BOTTOM') && cell.hasFilledNeighbor('RIGHT')) {
      els.push('<rect class="cell-corner cell-corner-bottom-right"/>');
      if (!this.hasGutter() && this.needsConnectedCorners()) {
        els.push('<rect class="edge edge-horizontal-bottom-right"/>');
        els.push('<rect class="edge edge-vertical-bottom-right"/>');
      }
    }

    return els.join('');
  }

  private getEmptyCellDiv(
    cell: Cell,
    coords: { x: number; y: number }
  ): string | void {
    const additionals = this.getEmptyCellCornersAndEdges(cell);

    if (!additionals) return;

    const els = [
      `<g class="empty" style="--cell-x: ${coords.x}px; --cell-y: ${coords.y}px;">`,
      additionals,
      '<rect class="cell cell-empty-bg"/>',
      '</g>',
    ];
    return els.join('');
  }

  private getFormattedCellDivs(cells: Iterable<Cell>): string {
    const els: string[] = [];

    for (const cell of cells) {
      const { x, y } = this.getSVGCellCoordinates(cell);
      if (cell.isFilled()) {
        const filledDiv = this.getFilledCellDiv(cell, { x, y });
        els.push(filledDiv);
      } else if (this.needsInnerRounding()) {
        const emtpyDiv = this.getEmptyCellDiv(cell, { x, y });
        if (emtpyDiv) els.push(emtpyDiv);
      }
    }

    return els.join('');
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

  public buildFrom(cells: Iterable<Cell>) {
    const backgroundWH = this.calculated.backgroundWH.toFixed(2);

    const svgEls: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${backgroundWH}" height="${backgroundWH}" viewbox="0 0 ${backgroundWH} ${backgroundWH}">`,
      `<style>${this.getFormattedCSS()}</style>`,
      `<rect class="background" />`,
      `<path class="pattern" d="${this.drawCompletePath(cells)}"/>`,
      '</svg>',
    ];

    const svg = svgEls.join('');

    this.string = svg;
  }

  drawCompletePath(cells: Iterable<Cell>) {
    let pathData = '';
    const roundingInner = this.config.cellRounding.inner;
    const roundingOuter = this.config.cellRounding.outer;
    const roundingsDiffer = this.config.strokeWidth
      ? roundingInner >= roundingOuter
      : roundingInner > roundingOuter;
    const canDrawInnerCorner =
      roundingInner && (roundingsDiffer || this.config.flow);
    for (const cell of cells) {
      let x = cell.col * (this.config.inner.cellSize + this.config.gutter);
      let y = cell.row * (this.config.inner.cellSize + this.config.gutter);
      if (cell.isFilled()) {
        pathData += this.drawFilledCellPath({ cell, coords: { x, y } });
      } else if (canDrawInnerCorner) {
        pathData += this.drawInnerCornersPath({ cell, coords: { x, y } });
      }
    }

    return pathData;
  }

  drawFilledCellPath(options: {
    cell: Cell;
    coords: { x: number; y: number };
  }) {
    let pathData = '';
    const cell = options.cell;
    const { x, y } = options.coords;
    const cellSize = this.config.inner.cellSize;
    const roundingOuter = this.config.cellRounding.outer;
    const rxOuter = this.calculated.cellRadius.outer;
    const flow = this.config.flow;
    let hasLeftNb: boolean;
    let hasTopNb: boolean;
    let hasRightNb: boolean;
    let hasBottomNb: boolean;
    let hasTopLeftNb: boolean;
    let hasTopRightNb: boolean;
    let hasBottomLeftNb: boolean;
    let hasBottomRightNb: boolean;
    pathData += `M ${x} ${y + cellSize / 2} `;
    if (roundingOuter < 1) {
      pathData += `L ${x} ${y + rxOuter} `;
    }
    if (roundingOuter) {
      if (
        flow &&
        ((hasLeftNb ??= cell.hasFilledNeighbor('LEFT')) ||
          (hasTopNb ??= cell.hasFilledNeighbor('TOP')) ||
          (hasTopLeftNb ??= cell.hasFilledNeighbor('TOP_LEFT')))
      ) {
        pathData += `L ${x} ${y} `;
        pathData += `L ${x + rxOuter} ${y} `;
      } else {
        pathData += `A ${rxOuter} ${rxOuter} 0 0 1 ${x + rxOuter} ${y} `;
      }
    }
    if (roundingOuter < 1) {
      pathData += `L ${x + cellSize - rxOuter} ${y} `;
    }
    if (roundingOuter) {
      if (
        flow &&
        ((hasRightNb ??= cell.hasFilledNeighbor('RIGHT')) ||
          (hasTopNb ??= cell.hasFilledNeighbor('TOP')) ||
          (hasTopRightNb ??= cell.hasFilledNeighbor('TOP_RIGHT')))
      ) {
        pathData += `L ${x + cellSize} ${y} `;
        pathData += `L ${x + cellSize} ${y + rxOuter} `;
      } else {
        pathData += `A ${rxOuter} ${rxOuter} 0 0 1 ${x + cellSize} ${
          y + rxOuter
        } `;
      }
    }
    if (roundingOuter < 1) {
      pathData += `L ${x + cellSize} ${y + cellSize - rxOuter} `;
    }
    if (roundingOuter) {
      if (
        flow &&
        ((hasRightNb ??= cell.hasFilledNeighbor('RIGHT')) ||
          (hasBottomNb ??= cell.hasFilledNeighbor('BOTTOM')) ||
          (hasBottomRightNb ??= cell.hasFilledNeighbor('BOTTOM_RIGHT')))
      ) {
        pathData += `L ${x + cellSize} ${y + cellSize} `;
        pathData += `L ${x + cellSize - rxOuter} ${y + cellSize} `;
      } else {
        pathData += `A ${rxOuter} ${rxOuter} 0 0 1 ${x + cellSize - rxOuter} ${
          y + cellSize
        } `;
      }
    }
    if (roundingOuter < 1) {
      pathData += `L ${x + rxOuter} ${y + cellSize} `;
    }
    if (roundingOuter) {
      if (
        flow &&
        ((hasLeftNb ??= cell.hasFilledNeighbor('LEFT')) ||
          (hasBottomNb ??= cell.hasFilledNeighbor('BOTTOM')) ||
          (hasBottomLeftNb ??= cell.hasFilledNeighbor('BOTTOM_LEFT')))
      ) {
        pathData += `L ${x} ${y + cellSize} `;
        pathData += `L ${x} ${y + cellSize - rxOuter} `;
      } else {
        pathData += `A ${rxOuter} ${rxOuter} 0 0 1 ${x} ${
          y + cellSize - rxOuter
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
    let pathData = '';
    const cell = options.cell;
    const { x, y } = options.coords;
    const cellSize = this.config.inner.cellSize;
    const rxInner = this.calculated.cellRadius.inner;
    const rxOuter = this.calculated.cellRadius.outer;
    const flow = this.config.flow;
    const hasTopNb = cell.hasFilledNeighbor('TOP');
    const hasBottomNb = cell.hasFilledNeighbor('BOTTOM');
    const hasLeftNb = cell.hasFilledNeighbor('LEFT');
    const hasRightNb = cell.hasFilledNeighbor('RIGHT');
    if (hasTopNb && hasLeftNb) {
      pathData += `M ${x} ${y + rxInner} `;
      pathData += `A ${rxInner} ${rxInner} 0 0 1 ${x + rxInner} ${y} `;
      pathData += `L ${x + rxOuter} ${y} `;
      if (flow) {
        pathData += `L ${x} ${y} `;
        pathData += `L ${x} ${y + rxOuter} `;
      } else if (rxOuter) {
        pathData += `A ${rxOuter} ${rxOuter} 0 0 0 ${x} ${y + rxOuter} `;
      }
      pathData += `L ${x} ${y + rxInner} `;
      pathData += 'Z ';
    }
    if (hasTopNb && hasRightNb) {
      pathData += `M ${x + cellSize - rxInner} ${y} `;
      pathData += `A ${rxInner} ${rxInner} 0 0 1 ${x + cellSize} ${
        y + rxInner
      } `;
      pathData += `L ${x + cellSize} ${y + rxOuter} `;
      if (flow) {
        pathData += `L ${x + cellSize} ${y} `;
        pathData += `L ${x + cellSize - rxOuter} ${y} `;
      } else if (rxOuter) {
        pathData += `A ${rxOuter} ${rxOuter} 0 0 0 ${
          x + cellSize - rxOuter
        } ${y} `;
      }
      pathData += `L ${x + cellSize - rxInner} ${y} `;
      pathData += 'Z ';
    }
    if (hasBottomNb && hasRightNb) {
      pathData += `M ${x + cellSize} ${y + cellSize - rxInner} `;
      pathData += `A ${rxInner} ${rxInner} 0 0 1 ${x + cellSize - rxInner} ${
        y + cellSize
      } `;
      pathData += `L ${x + cellSize - rxOuter} ${y + cellSize} `;
      if (flow) {
        pathData += `L ${x + cellSize} ${y + cellSize} `;
        pathData += `L ${x + cellSize} ${y + cellSize - rxOuter} `;
      } else if (rxOuter) {
        pathData += `A ${rxOuter} ${rxOuter} 0 0 0 ${x + cellSize} ${
          y + cellSize - rxOuter
        } `;
      }
      pathData += `L ${x + cellSize} ${y + cellSize - rxInner} `;
      pathData += 'Z ';
    }
    if (hasBottomNb && hasLeftNb) {
      pathData += `M ${x + rxInner} ${y + cellSize} `;
      pathData += `A ${rxInner} ${rxInner} 0 0 1 ${x} ${
        y + cellSize - rxInner
      } `;
      pathData += `L ${x} ${y + cellSize - rxOuter} `;
      if (flow) {
        pathData += `L ${x} ${y + cellSize} `;
        pathData += `L ${x + rxOuter} ${y + cellSize} `;
      } else if (rxOuter) {
        pathData += `A ${rxOuter} ${rxOuter} 0 0 0 ${x + rxOuter} ${
          y + cellSize
        } `;
      }
      pathData += `L ${x + rxInner} ${y + cellSize} `;
      pathData += 'Z ';
    }
    return pathData;
  }

  private needsSmoothing() {
    return this.config.gutter == 0;
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

  private getFormattedCorner(side: CellNeighborDirection): string {
    return `<rect class="cell-corner cell-corner-${CELL_CORNER_CSS[side]}"/>`;
  }

  private getFormattedEdge(orientation: CellEdgeOrientation): string {
    return `<rect class="edge edge-${orientation.toLowerCase()}"/>`;
  }

  private needsConnectedCorners() {
    return this.config.cellRounding.outer > 0 && this.config.flow === true;
  }

  private getFormattedEdgesAndCorners(cell: Cell): string {
    const els = new Set<string>();

    if (cell.hasFilledNeighbor('LEFT')) {
      if (this.needsConnectedCorners()) {
        els.add(this.getFormattedCorner('TOP_LEFT'));
        els.add(this.getFormattedCorner('BOTTOM_LEFT'));
      }
      if (this.needsSmoothing()) els.add(this.getFormattedEdge('VERTICAL'));
    }
    if (cell.hasFilledNeighbor('TOP_LEFT')) {
      if (this.needsConnectedCorners()) {
        els.add(this.getFormattedCorner('TOP_LEFT'));
      }
    }
    if (cell.hasFilledNeighbor('TOP')) {
      if (this.needsConnectedCorners()) {
        els.add(this.getFormattedCorner('TOP_LEFT'));
        els.add(this.getFormattedCorner('TOP_RIGHT'));
      }
    }
    if (cell.hasFilledNeighbor('TOP_RIGHT')) {
      if (this.needsConnectedCorners()) {
        els.add(this.getFormattedCorner('TOP_RIGHT'));
      }
    }
    if (cell.hasFilledNeighbor('RIGHT')) {
      if (this.needsConnectedCorners()) {
        els.add(this.getFormattedCorner('TOP_RIGHT'));
        els.add(this.getFormattedCorner('BOTTOM_RIGHT'));
      }
    }
    if (cell.hasFilledNeighbor('BOTTOM_RIGHT')) {
      if (this.needsConnectedCorners()) {
        els.add(this.getFormattedCorner('BOTTOM_RIGHT'));
      }
    }
    if (cell.hasFilledNeighbor('BOTTOM')) {
      if (this.needsConnectedCorners()) {
        els.add(this.getFormattedCorner('BOTTOM_LEFT'));
        els.add(this.getFormattedCorner('BOTTOM_RIGHT'));
      }
      if (this.needsSmoothing()) els.add(this.getFormattedEdge('HORIZONTAL'));
    }
    if (cell.hasFilledNeighbor('BOTTOM_LEFT')) {
      if (this.needsConnectedCorners()) {
        els.add(this.getFormattedCorner('BOTTOM_LEFT'));
      }
    }

    return [...els].join('');
  }

  private getSVGCellCoordinates(coord: CellCoordinates) {
    return {
      x:
        coord.col == 0
          ? coord.col * this.config.inner.cellSize
          : coord.col * (this.config.inner.cellSize + this.config.gutter),
      y:
        coord.row == 0
          ? coord.row * this.config.inner.cellSize
          : coord.row * (this.config.inner.cellSize + this.config.gutter),
    };
  }
}

const CELL_CORNER_CSS: Record<CellNeighborDirection, string> = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
};
