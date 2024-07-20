import {
  CELL_NEIGHBOR_CORNERS,
  CELL_NEIGHBOR_DIRECTIONS,
  CELL_NEIGHBOR_SIDES,
} from './constants';

export type CellCoordinates = { col: number; row: number };

export type CellNeighborSide = (typeof CELL_NEIGHBOR_SIDES)[number];

export type CellNeighborCorner = (typeof CELL_NEIGHBOR_CORNERS)[number];

export type CellNeighborDirection = (typeof CELL_NEIGHBOR_DIRECTIONS)[number];

export type CellEdgeOrientation = 'VERTICAL' | 'HORIZONTAL';
