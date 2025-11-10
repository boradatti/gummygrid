import { Grid } from '@/grid';
import QRCode from 'qrcode';
import { SVGWithQRAlignmentFill } from '@/svg';
import { DEFAULT_QRCODE_GENERATOR_CONFIG } from './constants';
import type {
  PartialQrCodeGeneratorConfig,
  QrCodeGeneratorConfig,
} from './types';
import { mergeObjectsRecursively } from '../../utils/helpers';

class QrCodeGenerator {
  config: QrCodeGeneratorConfig;

  constructor(config?: PartialQrCodeGeneratorConfig) {
    this.config = mergeObjectsRecursively(
      DEFAULT_QRCODE_GENERATOR_CONFIG,
      config ?? {}
    ) as QrCodeGeneratorConfig;
  }

  buildFrom(value: string) {
    const qr = QRCode.create(value, this.config.qr);

    const grid = new Grid({ size: qr.modules.size });
    const svg = new SVGWithQRAlignmentFill({
      ...this.config.svg,
      inner: {
        cellSize: 10,
        gridSize: grid.size,
      },
    });

    grid.buildFromQr({
      size: qr.modules.size,
      isFilled: ({ row, col }) => !!qr.modules.get(row, col),
    }); 
    svg.buildFrom(() => grid.iterateCells());

    return svg;
  }
}

export default QrCodeGenerator;
