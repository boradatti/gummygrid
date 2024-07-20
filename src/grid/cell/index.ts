import type Grid from '@/grid';
import {
  CELL_NEIGHBOR_CORNERS,
  CELL_NEIGHBOR_DIRECTIONS,
  CELL_NEIGHBOR_SIDES,
} from './constants';
import { CellCoordinates, CellNeighborDirection } from './types';

class Cell {
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

  markPooled(value: boolean) {
    this.pooled = value;
  }

  isEdgeCell() {
    return (
      this.row == 0 ||
      this.row == this.grid.size.rows - 1 ||
      this.col == 0 ||
      this.col == this.grid.size.columns - 1
    );
  }

  *iterateAllNeighbors() {
    for (const direction of CELL_NEIGHBOR_DIRECTIONS) {
      const neighbor = this.getNeighbor(direction);
      if (neighbor) {
        yield neighbor;
      }
    }
  }

  *iterateOrthogonalNeighbors() {
    for (const side of CELL_NEIGHBOR_SIDES) {
      const neighbor = this.getNeighbor(side);
      if (neighbor) {
        yield neighbor;
      }
    }
  }

  belongsToPool() {
    return this.pooled;
  }

  fill() {
    this.filled = true;
  }

  // todo: remove?
  unfill() {
    this.filled = false;
  }

  fillHorizontalParallel() {
    this.getHorizontalParallel()!.fill();
  }

  fillVerticalParallel() {
    const parallel = this.getVerticalParallel();
    parallel.fill();
    if (parallel.hasHorizontalParallel()) parallel.fillHorizontalParallel();
  }

  hasHorizontalParallel() {
    // in order for a cell NOT to have a parallel, the grid needs to
    // be odd-sized AND the cell needs to be in a middle column
    // therefore, if at least one of these conditions isn't met,
    // we know that the cell DOES have a parallel
    return !this.grid.isHorizontallyOddSized() || !this.isInMiddleColumn();
  }

  hasVerticalParallel() {
    return !this.grid.isVerticallyOddSized() || !this.isInMiddleRow();
  }

  isInMiddleColumn() {
    return this.col === Math.floor(this.grid.size.columns / 2);
  }

  isInMiddleRow() {
    return this.row === Math.floor(this.grid.size.rows / 2);
  }

  isFilled() {
    return this.filled === true;
  }

  isEmpty() {
    return !this.filled;
  }

  getNeighbor(side: CellNeighborDirection): Cell | undefined {
    return this._getNeighbor({ onSide: side });
  }

  getEqualNeighbor(side: CellNeighborDirection) {
    return this._getNeighbor({
      onSide: side,
      status: this.isFilled() ? 'filled' : 'empty',
    });
  }

  hasFilledNeighbor(side: CellNeighborDirection) {
    const neighbor = this.getNeighbor(side);
    return neighbor !== undefined && neighbor.isFilled();
  }

  hasEqualNeighbor(side: CellNeighborDirection) {
    return this._hasNeighbor({
      onSide: side,
      status: this.isFilled() ? 'filled' : 'empty',
    });
  }

  *iterateDiagonalNeighbors() {
    for (const corner of CELL_NEIGHBOR_CORNERS) {
      const neighbor = this.getNeighbor(corner);
      if (neighbor) {
        yield { neighbor, corner };
      }
    }
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
}

export default Cell;
