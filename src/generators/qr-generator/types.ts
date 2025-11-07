import { GridConfig } from '@/grid/types';
import type { SVGConfig } from '@/svg/types';
import { DeepPartial } from '@/utils/types';

export type QrCodeGeneratorConfig = {
  svg: SVGConfig;
};

export type PartialQrCodeGeneratorConfig = DeepPartial<QrCodeGeneratorConfig>;
