export type GridSharedInnerConfig = {
  size: number | { rows: number; columns: number };
};

export type GridWithRandomizerInnerConfig = GridSharedInnerConfig & {
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

export type GridConfig = GridSharedInnerConfig;

export type GridWithRandomizerConfig = Omit<
  GridWithRandomizerInnerConfig,
  'inner'
>;
