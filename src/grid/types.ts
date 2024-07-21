export type GridInnerConfig = {
  size: number | { rows: number; columns: number };
  verticalSymmetry: boolean;
  ensureFill: {
    topBottom?: boolean;
    leftRight?: boolean;
  };
  inner: {
    fillDecider: () => boolean;
    numberPicker: (min: number, max: number) => number;
  };
};

export type GridConfig = Omit<GridInnerConfig, 'inner'>;
