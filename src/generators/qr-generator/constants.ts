import type { QrCodeGeneratorConfig } from './types';

export const DEFAULT_QRCODE_GENERATOR_CONFIG: QrCodeGeneratorConfig = {
  qr: {},
  svg: {
    patternAreaRatio: 0.675,
    colors: {
      background: 'white',
      cellFill: 'black',
    },
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
