export type HideUnderscoreMethods<T> = {
  [K in keyof T as K extends `_${string}` ? never : K]: T[K];
};

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
