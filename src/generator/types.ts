import type { GridConfig } from '@/grid/types';
import type { ColorCategory, SVGConfig } from '@/svg/types';

export type RandomizerConfig = {
  salt: number;
  bias: {
    cellFillProbability: number;
    colorWeights: Partial<Record<ColorCategory, number[]>>;
  };
};

export type AvatarGeneratorConfig = {
  randomizer: RandomizerConfig;
  grid: GridConfig;
  svg: SVGConfig;
};

export type TwoLevelPartial<T> = {
  [K in keyof T]?: Partial<T[K]>;
};
