import { GridWithRandomizer } from '@/grid';
import Randomizer from '@/randomizer';
import { WeightLengthMismatchError } from '@/randomizer/errors';
import { SVGWithRandomizer } from '@/svg';
import { DEFAULT_AVATAR_GENERATOR_CONFIG } from './constants';
import type {
  AvatarGeneratorConfig,
  PartialAvatarGeneratorConfig,
} from './types';
import { mergeObjectsRecursively } from '../../utils/helpers';
import { HideUnderscoreMethods } from '@/utils/types';

class AvatarGenerator {
  config: AvatarGeneratorConfig;
  rand: Randomizer;
  grid: GridWithRandomizer;
  svg: HideUnderscoreMethods<SVGWithRandomizer>;

  constructor(config?: PartialAvatarGeneratorConfig) {
    this.config = mergeObjectsRecursively(
      DEFAULT_AVATAR_GENERATOR_CONFIG,
      config ?? {}
    ) as AvatarGeneratorConfig;
    this.rand = this.initializeRandomizer();
    this.grid = this.initializeGrid();
    this.svg = this.initializeSVG();
    this.connectLockedColorWeights();
  }

  buildFrom(value: string, outputFormat: 'web' | 'portable' = 'portable') {
    this.grid.clear();
    this.rand.setSeed(value);
    this.grid.build();
    this.svg.buildFromCells(() => this.grid.iterateCells(), outputFormat);
    return this.svg;
  }

  private initializeRandomizer() {
    return new Randomizer(this.config.randomizer.salt);
  }

  private initializeGrid() {
    return new GridWithRandomizer({
      ...this.config.grid,
      inner: {
        fillDecider: () => {
          return this.rand.boolean(
            this.config.randomizer.bias!.cellFillProbability
          );
        },
        numberPicker: (min, max) => {
          return this.rand.number(min, max);
        },
      },
    });
  }

  private initializeSVG() {
    return new SVGWithRandomizer({
      ...this.config.svg,
      inner: {
        colorIdxPicker: ({ category, colors }) => {
          const weights = this.config.randomizer.bias!.colorWeights?.[category];
          try {
            return this.rand.getChoiceIndex(colors, weights);
          } catch (e) {
            if (e instanceof WeightLengthMismatchError) {
              throw new Error(
                `The color and weight arrays for category "${category}" must be of equal length`
              );
            } else {
              throw e;
            }
          }
        },
        cellSize: 10,
        gridSize: this.grid.size,
      },
    });
  }

  private connectLockedColorWeights() {
    const colorWeights = this.config.randomizer.bias.colorWeights ?? {};
    let weights;
    for (const colorCategory of this.svg.lockedColors) {
      if (colorCategory in colorWeights) {
        weights = colorWeights[colorCategory]!;
        break;
      }
    }
    if (!weights) return;
    for (const colorCategory of this.svg.lockedColors) {
      colorWeights[colorCategory] = weights!;
    }
  }
}

export default AvatarGenerator;
