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
    const qrMatrix = this.getQrMatrixFrom(qr);
    const size = qrMatrix.length;

    const grid = new Grid({ size });
    const svg = new SVGWithQRAlignmentFill({
      ...this.config.svg,
      inner: {
        cellSize: 10,
        gridSize: grid.size,
      },
    });

    grid.buildFromMatrix(qrMatrix);
    svg.buildFrom(() => grid.iterateCells());

    return svg;
  }

  private getQrMatrixFrom(qr: QRCode.QRCode) {
    const size = qr.modules.size;
    const matrix = [];
    for (let row = 0; row < size; row++) {
      const rowArr = [];
      for (let col = 0; col < size; col++) {
        rowArr.push(qr.modules.get(row, col));
      }
      matrix.push(rowArr);
    }

    return matrix as Array<Array<1 | 0>>;
  }
}

export default QrCodeGenerator;
