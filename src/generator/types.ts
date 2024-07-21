import type { GridConfig } from '@/grid/types';
import type { ColorCategory, SVGConfig } from '@/svg/types';

type RandomizerConfig = {
  salt: number;
  bias: {
    cellFillProbability?: number;
    colorWeights?: Partial<Record<ColorCategory, number[]>>;
  };
};

export type AvatarGeneratorConfig = {
  randomizer: RandomizerConfig;
  grid: GridConfig;
  svg: SVGConfig;
};

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type GummyGridConfig = DeepPartial<AvatarGeneratorConfig>;
