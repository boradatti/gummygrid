import type { GridWithRandomizerConfig } from '@/grid/types';
import type { ColorCategory, SVGWithRandomizerConfig } from '@/svg/types';

type RandomizerConfig = {
  salt: number;
  bias: {
    cellFillProbability?: number;
    colorWeights?: Partial<Record<ColorCategory, number[]>>;
  };
};

export type AvatarGeneratorConfig = {
  randomizer: RandomizerConfig;
  grid: GridWithRandomizerConfig;
  svg: SVGWithRandomizerConfig;
};

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type PartialAvatarGeneratorConfig = DeepPartial<AvatarGeneratorConfig>;
