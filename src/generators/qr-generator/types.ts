import { GridConfig } from '@/grid/types';
import type { SVGConfig } from '@/svg/types';
import { DeepPartial } from '@/utils/types';

export type QrCodeGeneratorConfig = {
  qr: {
    typeNumber: TypeNumber;
    errorCorrectionLevel: ErrorCorrectionLevel;
  };
  svg: SVGConfig;
};

export type PartialQrCodeGeneratorConfig = DeepPartial<QrCodeGeneratorConfig>;
