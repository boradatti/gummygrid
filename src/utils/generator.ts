import { Grid } from '@/utils/grid';
import type { GridConfig } from '@/utils/grid';
import { SVG } from '@/utils/svg';
import type { SVGConfig } from '@/utils/svg';
import { Randomizer } from '@/utils/randomizer';

type RandomizerConfig = {
  salt: number;
  bias: {
    cellFillProbability: number;
    cellColorWeights?: number[];
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
      cellColorWeights: undefined,
    },
  },
  grid: {
    size: {
      rows: 8,
      columns: 8,
    },
    ensureFill: {
      topBottom: true,
      leftRight: true,
    },
    verticalSymmetry: false,
  },
  svg: {
    backgroundColor: 'white',
    patternAreaRatio: 0.75,
    cellColors: ['red', 'blue', 'green', 'yellow'],
    cellRounding: {
      outer: 0,
      inner: 0,
    },
    gutter: 0,
    connectCorners: true,
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
        cellColorPicker: (colors) => {
          return this.rand.choice(
            colors,
            this.config.randomizer.bias!.cellColorWeights
          );
        },
        cellSize: 10,
        gridSize: this.grid.size,
      },
    });
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
