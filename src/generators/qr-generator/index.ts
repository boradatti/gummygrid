import { Grid } from '@/grid';
import { SVG } from '@/svg';
import { DEFAULT_QRCODE_GENERATOR_CONFIG } from './constants';
import type {
  PartialQrCodeGeneratorConfig,
  QrCodeGeneratorConfig,
} from './types';
import { mergeObjectsRecursively } from '../../utils/helpers';
import qrcode from 'qrcode-generator';

class QrCodeGenerator {
  config: QrCodeGeneratorConfig;

  constructor(config?: PartialQrCodeGeneratorConfig) {
    this.config = mergeObjectsRecursively(
      DEFAULT_QRCODE_GENERATOR_CONFIG,
      config ?? {}
    ) as QrCodeGeneratorConfig;
  }

  buildFrom(value: string) {
    const qrMatrix = this.getQrMatrixFrom(value);
    const size = { rows: qrMatrix.length, columns: qrMatrix[0]?.length ?? 0 };

    const grid = new Grid({ size });
    const svg = new SVG({
      ...this.config.svg,
      inner: {
        cellSize: 10,
        gridSize: grid.size,
      },
    });

    grid.buildFromMatrix(qrMatrix);
    svg.buildFrom(grid.iterateCells());

    return svg;
  }

  private getQrMatrixFrom(value: string) {
    const qr = qrcode(0, 'L');
    qr.addData(value);
    qr.make();

    const size = qr.getModuleCount();
    const matrix = [];
    for (let row = 0; row < size; row++) {
      const rowArr = [];
      for (let col = 0; col < size; col++) {
        rowArr.push(qr.isDark(row, col) ? 1 : 0);
      }
      matrix.push(rowArr);
    }

    return matrix as Array<Array<1 | 0>>;
  }
}

export default QrCodeGenerator;
