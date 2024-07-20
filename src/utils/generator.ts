import { Grid } from '@/utils/grid';
import type { GridConfig } from '@/utils/grid';
import { SVG } from '@/utils/svg';
import type { ColorCategory, SVGConfig } from '@/utils/svg';
import { Randomizer, WeightLengthMismatchError } from '@/utils/randomizer';

type RandomizerConfig = {
  salt: number;
  bias: {
    cellFillProbability: number;
    colorWeights: Partial<Record<ColorCategory, number[]>>;
  };
};

type AvatarGeneratorConfig = {
  randomizer: RandomizerConfig;
  grid: GridConfig;
  svg: SVGConfig;
};

const defaultAvatarGeneratorConfig: AvatarGeneratorConfig = {
  randomizer: {
    salt: 0,
    bias: {
      cellFillProbability: 0.5,
      colorWeights: {},
    },
  },
  grid: {
    size: {
      rows: 5,
      columns: 5,
    },
    ensureFill: {
      topBottom: true,
      leftRight: true,
    },
    verticalSymmetry: false,
  },
  svg: {
    patternAreaRatio: 0.675,
    colors: {
      background: ['#ededfe'],
      cellFill: [
        '#019244',
        '#11adc8',
        '#2e3192',
        '#3aa17e',
        '#3e72bd',
        '#4f00bc',
        '#662d8c',
        '#8e78ff',
        '#d4145a',
        '#ed1f26',
        '#fbb03b',
        '#fd811d',
      ],
      cellStroke: [],
      dropShadow: [],
    },
    lockColors: [],
    cellRounding: {
      outer: 0,
      inner: 0,
    },
    gutter: 0,
    flow: true,
    strokeWidth: 0,
    filters: {},
    paintOrder: 'stroke',
    strokeLineJoin: 'miter',
  },
};

type TwoLevelPartial<T> = {
  [K in keyof T]?: Partial<T[K]>;
};

export class GummyGrid {
  config: AvatarGeneratorConfig;
  rand: Randomizer;
  grid: Grid;
  svg: SVG;

  public constructor(config?: TwoLevelPartial<AvatarGeneratorConfig>) {
    this.config = mergeObjectsRecursively(
      defaultAvatarGeneratorConfig,
      config ?? {}
    ) as AvatarGeneratorConfig;
    this.rand = this.initializeRandomizer();
    this.grid = this.initializeGrid();
    this.svg = this.initializeSVG();
    this.connectLockedColorWeights();
  }

  public buildFrom(value: string) {
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
    const { colorWeights } = this.config.randomizer.bias;
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

// * utils:

function mergeObjectsRecursively(
  obj1: Record<any, any>,
  obj2: Record<any, any>
) {
  for (const p in obj2) {
    if (obj2[p]?.constructor === Object) {
      obj1[p] = mergeObjectsRecursively(obj1[p], obj2[p]);
    } else {
      obj1[p] = obj2[p];
    }
  }

  return obj1;
}
