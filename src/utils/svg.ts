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
  connectCorners: boolean;
  gutter: number;
  cellRounding: { inner: number; outer: number };
  inner: {
    cellSize: number;
    gridSize: Exclude<GridConfig['size'], number>;
    cellColorPicker: (colors: string[]) => string;
  };
};

export type SVGConfig = Omit<SVGInnerConfig, 'inner'>;

export class SVG {
  private string: string = '';
  private readonly config: Readonly<SVGInnerConfig>;

  public constructor(config: SVGInnerConfig) {
    this.config = config;
    this.normalizeCellRounding();
  }

  private normalizeCellRounding() {
    const { inner, outer } = this.config.cellRounding;
    if (inner < 0 || inner > 1 || outer < 0 || outer > 1)
      throw new Error(
        'Inner and outer rounding should both be numbers between 0 and 1'
      );
    this.config.cellRounding.inner = (inner * this.config.inner.cellSize) / 2;
    this.config.cellRounding.outer = (outer * this.config.inner.cellSize) / 2;
  }

  private pickCellColor() {
    return this.config.inner.cellColorPicker(this.config.cellColors);
  }

  private getFormattedCSS(): string {
    const css = `
    :root {
      --cell-rounding-outer: ${this.config.cellRounding.outer}px;
      --cell-rounding-inner: ${this.config.cellRounding.inner}px;
      --cell-size: ${this.config.inner.cellSize}px;
      --cell-color: ${this.pickCellColor()};
      --gutter: ${this.config.gutter}px;
      --num-rows: ${this.config.inner.gridSize.rows};
      --num-columns: ${this.config.inner.gridSize.columns};
      --background-color: ${this.config.backgroundColor};
      --connect-corners-factor: ${+!this.config.connectCorners};
    }

    .background {
      width: 100%;
      height: 100%;
      fill: var(--background-color);
    }

    .pattern {
      --width: calc(var(--cell-size) * var(--num-columns) + var(--gutter) * var(--num-columns) - var(--gutter));
      --height: calc(var(--cell-size) * var(--num-rows) + var(--gutter) * var(--num-rows) - var(--gutter));
      --transform-x: calc((100% - var(--width)) / 2);
      --transform-y: calc((100% - var(--height)) / 2);
      transform: translate(var(--transform-x), var(--transform-y));
    }

    .cell {
      x: var(--cell-x);
      y: var(--cell-y);
      width: var(--cell-size);
      height: var(--cell-size);
    }

    .cell-corner {
      width: calc(var(--cell-size) / 2);
      height: calc(var(--cell-size) / 2);
    }

    .filled .cell-corner {
      fill: var(--cell-color);
    }

    .cell-corner-top-left {
      x: var(--cell-x);
      y: var(--cell-y);
    }

    .cell-corner-top-right {
      x: calc(var(--cell-x) + var(--cell-size) / 2);
      y: var(--cell-y);
    }

    .cell-corner-bottom-left {
      x: var(--cell-x);
      y: calc(var(--cell-y) + var(--cell-size) / 2);
    }

    .cell-corner-bottom-right {
      x: calc(var(--cell-x) + var(--cell-size) / 2);
      y: calc(var(--cell-y) + var(--cell-size) / 2);
    }

    .filled .cell {
      fill: var(--cell-color);
      rx: var(--cell-rounding-outer);
    }

    .edge {
      fill: var(--cell-color);
    }

    .filled .edge-vertical {
      x: calc(var(--cell-x) - var(--cell-size) * 0.05);
      y: calc(var(--cell-y) + var(--cell-rounding-outer) * var(--connect-corners-factor));
      width: 1px;
      height: calc(var(--cell-size) - var(--cell-rounding-outer) * 2 * var(--connect-corners-factor));
    }

    .filled .edge-horizontal {
      x: calc(var(--cell-x) + var(--cell-rounding-outer) * var(--connect-corners-factor));
      y: calc(var(--cell-size) * 0.95 + var(--cell-y));
      height: 1px;
      width: calc(var(--cell-size) - var(--cell-rounding-outer) * 2 * var(--connect-corners-factor));
    }

    .empty .cell.cell-empty {
      rx: 0;
      fill: var(--cell-color);
    }

    .empty .cell.cell-empty-bg {
      rx: var(--cell-rounding-inner);
      fill: var(--background-color);
    }

    .empty .cell-corner {
      fill: var(--cell-color);
      rx: ${this.needsConnectedCorners() ? '0' : `var(--cell-rounding-outer)`};
    }

    .empty .edge-horizontal-top-left {
      x: var(--cell-x);
      y: calc(var(--cell-y) - var(--cell-size) * 0.05);
      height: 1px;
      width: calc(var(--cell-size) / 2);
    }

    .empty .edge-vertical-top-left {
      x: calc(var(--cell-x) - var(--cell-size) * 0.05);
      y: var(--cell-y);
      width: 1px;
      height: calc(var(--cell-size) / 2);
    }

    .empty .edge-horizontal-top-right {
      x: calc(var(--cell-x) + var(--cell-size) / 2);
      y: calc(var(--cell-y) - var(--cell-size) * 0.05);
      height: 1px;
      width: calc(var(--cell-size) / 2);
    }

    .empty .edge-vertical-top-right {
      x: calc(var(--cell-x) + var(--cell-size) * 0.95);
      y: var(--cell-y);
      width: 1px;
      height: calc(var(--cell-size) / 2);
    }

    .empty .edge-horizontal-bottom-right {
      x: calc(var(--cell-x) + var(--cell-size) / 2);
      y: calc(var(--cell-y) + var(--cell-size) * 0.95);
      height: 1px;
      width: calc(var(--cell-size) / 2);
    }

    .empty .edge-vertical-bottom-right {
      x: calc(var(--cell-x) + var(--cell-size) * .95);
      y: calc(var(--cell-y) + var(--cell-size) / 2);
      width: 1px;
      height: calc(var(--cell-size) / 2);
    }

    .empty .edge-horizontal-bottom-left {
      x: var(--cell-x);
      y: calc(var(--cell-y) + var(--cell-size) * .95);
      height: 1px;
      width: calc(var(--cell-size) / 2);
    }

    .empty .edge-vertical-bottom-left {
      x: calc(var(--cell-x) - var(--cell-size) * 0.05);
      y: calc(var(--cell-y) + var(--cell-size) / 2);
      width: 1px;
      height: calc(var(--cell-size) / 2);
    }
    `;

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

  private getBackgroundWHString() {
    const { rows, columns } = this.config.inner.gridSize;
    const { cellSize } = this.config.inner;
    const { gutter, patternAreaRatio } = this.config;
    const ptnWidth = cellSize * columns + gutter * (columns - 1);
    const ptnHeight = cellSize * rows + gutter * (rows - 1);
    const backgroundWH = Math.max(ptnWidth, ptnHeight) / patternAreaRatio;
    return backgroundWH.toFixed(2);
  }

  public buildFrom(cells: Iterable<Cell>) {
    const backgroundWH = this.getBackgroundWHString();

    const svgEls: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${backgroundWH} ${backgroundWH}">`,
      `<style>${this.getFormattedCSS()}</style>`,
      '<rect class="background"/>',
      `<g class="pattern">${this.getFormattedCellDivs(cells)}</g>`,
      '</svg>',
    ];

    const svg = svgEls.join('');

    this.string = svg;
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
    return (
      this.config.cellRounding.outer > 0 && this.config.connectCorners === true
    );
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
