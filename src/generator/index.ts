import Grid from '@/grid';
import Randomizer from '@/randomizer';
import { WeightLengthMismatchError } from '@/randomizer/errors';
import SVG from '@/svg';
import { DEFAULT_AVATAR_GENERATOR_CONFIG } from './constants';
import type { AvatarGeneratorConfig, GummyGridConfig } from './types';
import { mergeObjectsRecursively } from './utils';

class GummyGrid {
  config: AvatarGeneratorConfig;
  rand: Randomizer;
  grid: Grid;
  svg: SVG;

  constructor(config?: GummyGridConfig) {
    this.config = mergeObjectsRecursively(
      DEFAULT_AVATAR_GENERATOR_CONFIG,
      config ?? {}
    ) as AvatarGeneratorConfig;
    this.rand = this.initializeRandomizer();
    this.grid = this.initializeGrid();
    this.svg = this.initializeSVG();
    this.connectLockedColorWeights();
  }

  buildFrom(value: string) {
    this.rand.setSeed(value);
    this.grid.build();
    this.svg.buildFrom(this.grid.iterateCells());
  }

  private initializeRandomizer() {
    return new Randomizer(this.config.randomizer.salt);
  }

  private initializeGrid() {
    return new Grid({
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
    return new SVG({
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
    for (const colorCategory of this.svg.getLockedColors()) {
      if (colorCategory in colorWeights) {
        weights = colorWeights[colorCategory]!;
        break;
      }
    }
    if (!weights) return;
    for (const colorCategory of this.svg.getLockedColors()) {
      colorWeights[colorCategory] = weights!;
    }
  }
}

export default GummyGrid;
