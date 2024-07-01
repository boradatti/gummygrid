import type { Grid } from './grid';

export class Cell {
  private grid: Grid;
  private filled: boolean;
  private pooled: boolean | null;
  public col: number;
  public row: number;

  constructor(grid: Grid, coords: CellCoordinates) {
    this.grid = grid;
    this.col = coords.col;
    this.row = coords.row;
    this.filled = false;
    this.pooled = null;
  }

  public markPooled(value: boolean) {
    this.pooled = value;
  }

  public belongsToPool() {
    return this.pooled;
  }

  public fill() {
    this.filled = true;
  }

  public unfill() {
    this.filled = false;
  }

  private getHorizontalParallelCoords() {
    return {
      row: this.row,
      col: this.grid.size.columns - this.col - 1,
    };
  }

  private getHorizontalParallel() {
    const coords = this.getHorizontalParallelCoords();
    return this.grid.getCell(coords);
  }

  public fillHorizontalParallel() {
    this.getHorizontalParallel()!.fill();
  }

  private getVerticalParallelCoords() {
    return {
      col: this.col,
      row: this.grid.size.rows - this.row - 1,
    };
  }

  private getVerticalParallel() {
    const coords = this.getVerticalParallelCoords();
    return this.grid.getCell(coords)!;
  }

  public fillVerticalParallel() {
    const parallel = this.getVerticalParallel();
    parallel.fill();
    if (parallel.hasHorizontalParallel()) parallel.fillHorizontalParallel();
  }

  public hasHorizontalParallel() {
    // in order for a cell NOT to have a parallel, the grid needs to
    // be odd-sized AND the cell needs to be in a middle column
    // therefore, if at least one of these conditions isn't met,
    // we know that the cell DOES have a parallel
    return !this.grid.isHorizontallyOddSized() || !this.isInMiddleColumn();
  }

  public hasVerticalParallel() {
    return !this.grid.isVerticallyOddSized() || !this.isInMiddleRow();
  }

  public isInMiddleColumn() {
    return this.col === Math.floor(this.grid.size.columns / 2);
  }

  public isInMiddleRow() {
    return this.row === Math.floor(this.grid.size.rows / 2);
  }

  public isFilled() {
    return this.filled === true;
  }

  public isEmpty() {
    return !this.filled;
  }

  private getNeighborCoordinates(side: CellNeighborDirection): CellCoordinates {
    switch (side) {
      case 'LEFT':
        return { col: this.col - 1, row: this.row };
      case 'TOP_LEFT':
        return { col: this.col - 1, row: this.row - 1 };
      case 'TOP':
        return { col: this.col, row: this.row - 1 };
      case 'TOP_RIGHT':
        return { col: this.col + 1, row: this.row - 1 };
      case 'RIGHT':
        return { col: this.col + 1, row: this.row };
      case 'BOTTOM_RIGHT':
        return { col: this.col + 1, row: this.row + 1 };
      case 'BOTTOM':
        return { col: this.col, row: this.row + 1 };
      case 'BOTTOM_LEFT':
        return { col: this.col - 1, row: this.row + 1 };
    }
  }

  public getNeighbor(side: CellNeighborDirection): Cell | undefined {
    return this._getNeighbor({ onSide: side });
  }

  private _getNeighbor(options: {
    onSide: CellNeighborDirection;
    status?: 'filled' | 'empty' | 'any';
  }) {
    let { onSide, status } = options;
    status ??= 'any';
    const neighbor = this.grid.getCell(this.getNeighborCoordinates(onSide));
    if (!neighbor) return;
    if (status == 'any') return neighbor;
    if (status == 'filled' && neighbor.isFilled()) return neighbor;
    if (status == 'empty' && neighbor.isEmpty()) return neighbor;
  }

  private _hasNeighbor(options: {
    onSide: CellNeighborDirection;
    status?: 'filled' | 'empty' | 'any';
  }) {
    return !!this._getNeighbor(options);
  }

  public getEqualNeighbor(side: CellNeighborDirection) {
    return this._getNeighbor({
      onSide: side,
      status: this.isFilled() ? 'filled' : 'empty',
    });
  }

  public hasFilledNeighbor(side: CellNeighborDirection) {
    const neighbor = this.getNeighbor(side);
    return neighbor && neighbor.isFilled();
  }

  public hasEqualNeighbor(side: CellNeighborDirection) {
    return this._hasNeighbor({
      onSide: side,
      status: this.isFilled() ? 'filled' : 'empty',
    });
  }

  public *iterateDiagonalNeighbors() {
    for (const corner of CELL_NEIGHBOR_CORNERS) {
      const neighbor = this.getNeighbor(corner);
      if (neighbor) {
        yield { neighbor, corner };
      }
    }
  }
}

export type CellCoordinates = { col: number; row: number };

export const CELL_NEIGHBOR_SIDES = ['LEFT', 'TOP', 'RIGHT', 'BOTTOM'] as const;
export const CELL_NEIGHBOR_CORNERS = [
  'TOP_LEFT',
  'TOP_RIGHT',
  'BOTTOM_RIGHT',
  'BOTTOM_LEFT',
] as const;
export const CELL_NEIGHBOR_DIRECTIONS = [
  ...CELL_NEIGHBOR_SIDES,
  ...CELL_NEIGHBOR_CORNERS,
] as const;

export type CellNeighborSide = (typeof CELL_NEIGHBOR_SIDES)[number];
export type CellNeighborCorner = (typeof CELL_NEIGHBOR_CORNERS)[number];
export type CellNeighborDirection = (typeof CELL_NEIGHBOR_DIRECTIONS)[number];

export type CellEdgeOrientation = 'VERTICAL' | 'HORIZONTAL';
