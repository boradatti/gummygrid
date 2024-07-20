import Cell from './cell';
import { CELL_NEIGHBOR_DIRECTIONS } from './cell/constants';
import type { CellCoordinates } from './cell/types';
import { GridInnerConfig } from './types';

class Grid {
  private readonly config: GridInnerConfig;
  private readonly grid: Array<Array<Cell>>;
  public readonly size: Readonly<{ rows: number; columns: number }>;

  public constructor(config: GridInnerConfig) {
    this.config = config;
    this.size = this.getNormalizedSize();
    this.grid = this.getInitialGrid();
  }

  private getNormalizedSize() {
    const [rows, columns] =
      typeof this.config.size == 'number'
        ? [this.config.size, this.config.size]
        : [this.config.size.rows, this.config.size.columns];
    if (
      rows <= 0 ||
      columns <= 0 ||
      !Number.isInteger(rows) ||
      !Number.isInteger(columns)
    )
      throw new Error('Rows and columns must both be a positive integer');
    return { rows, columns };
  }

  private getInitialGrid() {
    const grid: typeof this.grid = [];
    for (const row of this.iterateRows()) {
      grid[row] = [];
      for (const col of this.iterateColumns()) {
        grid[row]![col] = new Cell(this, { row, col });
      }
    }
    return grid;
  }

  public wannaFill() {
    return this.config.inner.fillDecider();
  }

  public pickNumber(min: number, max: number) {
    return this.config.inner.numberPicker(min, max);
  }

  public hasFilledCell(coord: CellCoordinates) {
    return this.getCell(coord)!.isFilled();
  }

  public build() {
    this.generateCells();
    if (this.needsTopBottomCells()) this.ensureTopBottomCells();
    if (this.needsLeftRightCells()) this.ensureLeftRightCells();
  }

  private needsTopBottomCells() {
    return this.config.ensureFill.topBottom == true;
  }

  private needsLeftRightCells() {
    return this.config.ensureFill.leftRight == true;
  }

  public getCell({ row, col }: CellCoordinates) {
    return this.grid[row]?.[col];
  }

  private ensureTopBottomCells() {
    const rows = [];
    const cols = [...Array(this.size.columns).keys()];
    if (!this.hasFilledCellsTop()) rows.push(0);
    if (!this.hasFilledCellsBottom()) rows.push(this.size.rows - 1);
    for (const row of rows) {
      const col = this.pickNumber(0, Math.floor(this.size.columns / 2));
      this.fillCellAndParallel(this.getCell({ row, col })!);
      for (const c of cols) {
        if (c === col) continue;
        if (this.wannaFill()) {
          this.fillCellAndParallel(this.getCell({ row, col: c })!);
          break;
        }
      }
    }
  }

  private ensureLeftRightCells() {
    const cols = [];
    const rows = [...Array(this.size.rows).keys()];
    if (!this.hasFilledCellsLeft()) cols.push(0);
    if (!this.hasFilledCellsRight()) cols.push(this.size.columns - 1);
    for (const col of cols) {
      const row = this.pickNumber(0, Math.floor(this.size.rows / 2));
      this.fillCellAndParallel(this.getCell({ row, col })!);
      for (const r of rows) {
        if (r === row) continue;
        if (this.wannaFill()) {
          this.fillCellAndParallel(this.getCell({ col, row: r })!);
          break;
        }
      }
    }
  }

  public isHorizontallyOddSized() {
    return this.size.columns % 2 !== 0;
  }

  public isVerticallyOddSized() {
    return this.size.rows % 2 !== 0;
  }

  private fillCellAndParallel(cell: Cell) {
    cell.fill();
    if (cell.hasHorizontalParallel()) {
      cell.fillHorizontalParallel();
    }
    if (this.isVerticallySymmetrical() && cell.hasVerticalParallel()) {
      cell.fillVerticalParallel();
    }
  }

  private generateCells() {
    for (const cell of this.iterateFillableCells()) {
      if (this.wannaFill()) {
        this.fillCellAndParallel(cell);
      }
    }
  }

  private hasFilledCellsTop() {
    const firstRow = this.grid[0]!;
    return firstRow.some((cell) => cell.isFilled());
  }

  private hasFilledCellsBottom() {
    const lastRow = this.grid[this.size.rows - 1]!;
    return lastRow.some((cell) => cell.isFilled());
  }

  private hasFilledCellsLeft() {
    const firstColumn = this.grid.map((row) => row[0]!);
    return firstColumn.some((cell) => cell.isFilled());
  }

  private hasFilledCellsRight() {
    const lastColumn = this.grid.map((row) => row[this.size.columns - 1]!);
    return lastColumn.some((cell) => cell.isFilled());
  }

  public clear() {
    for (const cell of this.iterateCells()) {
      cell.unfill();
    }
  }

  private *iterateRows() {
    for (let r = 0; r < this.size.rows; r++) {
      yield r;
    }
  }

  private *iterateColumns() {
    for (let c = 0; c < this.size.columns; c++) {
      yield c;
    }
  }

  public *iterateCells() {
    for (const row of this.iterateRows()) {
      for (const col of this.iterateColumns()) {
        yield this.grid[row]![col]!;
      }
    }
  }

  private *iterateFillalbleColumns() {
    // iterate up to middle column
    // (inclusive if grid is odd-zied, exclusive if even-sized)
    for (let c = 0; c < Math.ceil(this.size.columns / 2); c++) {
      yield c;
    }
  }

  public isVerticallySymmetrical() {
    return this.config.verticalSymmetry == true;
  }

  private *iterateFillableRows() {
    const rowLimit = this.isVerticallySymmetrical()
      ? Math.ceil(this.size.rows / 2)
      : this.size.rows;
    for (let r = 0; r < rowLimit; r++) {
      yield r;
    }
  }

  private *iterateFillableCells() {
    for (const row of this.iterateFillableRows()) {
      for (const col of this.iterateFillalbleColumns()) {
        yield this.grid[row]![col]!;
      }
    }
  }

  public log() {
    const loggableGridArr = this.grid.map((row) =>
      row.map((cell) => (cell.isFilled() ? '•' : ' '))
    );
    const loggableGrid = loggableGridArr.map((row) => row.join(' ')).join('\n');
    console.log(loggableGrid);
  }

  public *iterateIslandCells() {
    const visited = new Set<Cell>();

    for (const cell of this.iterateCells()) {
      if (visited.has(cell) || cell.isEmpty()) continue;
      visited.add(cell);
      const stack: Array<Cell> = [cell];
      while (stack.length > 0) {
        const cell = stack.pop()!;
        for (const direction of CELL_NEIGHBOR_DIRECTIONS) {
          const neighbor = cell.getNeighbor(direction);
          if (neighbor && !visited.has(neighbor) && neighbor.isFilled()) {
            visited.add(neighbor);
            stack.push(neighbor);
          }
        }
      }

      yield cell;
    }
  }

  public *iteratePoolCells() {
    const poolCells = new Set<Cell>();
    const spillCells = new Set<Cell>();
    for (const cell of this.iterateCells()) {
      if (cell.isEmpty()) {
        if (cell.isEdgeCell()) {
          spillCells.add(cell);
        } else {
          poolCells.add(cell); // i.e. let's first consider all non-edge empty cells to be pool cells
        }
      }
    }

    // now let's exclude spill cells from the pool cell candidate set
    for (const cell of spillCells) {
      for (const neighbor of cell.iterateOrthogonalNeighbors()) {
        if (poolCells.has(neighbor)) {
          poolCells.delete(neighbor);
          spillCells.add(neighbor);
        }
      }
    }

    // finally, let's yield the first cell we find in each pool
    for (const cell of poolCells) {
      let firstPoolCell = cell;
      const stack: Cell[] = [cell];
      while (stack.length) {
        const neighborPoolCell = stack.pop()!;
        poolCells.delete(neighborPoolCell);
        neighborPoolCell.markPooled(true);
        for (const neighbor of neighborPoolCell.iterateAllNeighbors()) {
          if (poolCells.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
      yield firstPoolCell;
    }
  }

  public getMatrix() {
    return this.grid.map((r) => r.map((c) => +c.isFilled()));
  }

  public logAsMatrix() {
    return console.log(this.getMatrix());
  }
}

export default Grid;
