import type { GridConfig } from '@/grid/types';

export type SVGInnerConfig = {
  patternAreaRatio: number;
  colors: {
    background?: SVGColor[];
    cellFill?: SVGColor[];
    cellStroke?: SVGColor[];
    dropShadow?: string[];
  };
  lockColors: ColorCategory[] | 'all';
  flow: boolean;
  gutter: number;
  cellRounding: { inner?: number; outer?: number };
  strokeWidth: number;
  paintOrder: 'stroke' | 'normal';
  strokeLineJoin: 'miter' | 'miter-clip' | 'round' | 'bevel' | 'arcs';
  filters: {
    blur?: string;
    brightness?: string;
    contrast?: string;
    dropShadow?: [string, string, string];
    grayscale?: string;
    hueRotate?: string;
    invert?: string;
    opacity?: string;
    saturate?: string;
    sepia?: string;
  };
  inner: {
    cellSize: number;
    gridSize: Exclude<GridConfig['size'], number>;
    colorIdxPicker: (options: {
      category: ColorCategory;
      colors: SVGColor[];
    }) => number;
  };
};

export type SVGCalculatedValues = {
  ptnWidth: number;
  ptnHeight: number;
  backgroundWH: number;
  cellRadius: { outer: number; inner: number };
};

export type SVGConfig = Omit<SVGInnerConfig, 'inner'>;

export type SVGGradientTag = 'radialGradient' | 'linearGradient';

export type SVGLinearGradientAttributes = {
  x1?: string;
  x2?: string;
  y1?: string;
  y2?: string;
  gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  gradientTransform?: string;
  spreadMethod?: 'pad' | 'reflect' | 'repeat';
  href?: string;
};

export type SVGRadialGradientAttributes = {
  cx?: string;
  cy?: string;
  r?: string;
  fx?: string;
  fy?: string;
  fr?: string | 'userSpaceOnUse' | 'objectBoundingBox';
  transform?: string;
  href?: string;
  r2: string;
  spreadMethod?: 'pad' | 'reflect' | 'repeat';
};

export type SVGColor =
  | string
  | {
      type: 'linearGradient';
      attrs: SVGLinearGradientAttributes;
      stops: Array<Stop>;
    }
  | {
      type: 'radialGradient';
      attrs: SVGRadialGradientAttributes;
      stops: Array<Stop>;
    };

export type SVGGradientColor = Exclude<SVGColor, string>;

export type ColorCategory = keyof SVGConfig['colors'];

export type ColorsByCategory = { [K in ColorCategory]: SVGColor };

export type Stop = {
  offset: number | `${number}%`;
  color: string;
  opacity?: number;
};

export type GradientSVGTagMap = Record<ColorCategory, string>;
