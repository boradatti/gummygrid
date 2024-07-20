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
