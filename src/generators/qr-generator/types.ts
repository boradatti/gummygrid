import type { SVGConfig } from '@/svg/types';
import { DeepPartial } from '@/utils/types';
import { QRCodeOptions } from 'qrcode';

export type QrCodeGeneratorConfig = {
  qr: QRCodeOptions;
  svg: SVGConfig;
};

export type PartialQrCodeGeneratorConfig = DeepPartial<QrCodeGeneratorConfig>;
