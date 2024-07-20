import type { AvatarGeneratorConfig } from './types';

export const DEFAULT_AVATAR_GENERATOR_CONFIG: AvatarGeneratorConfig = {
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
      topBottom: false,
      leftRight: false,
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
