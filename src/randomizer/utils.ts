export function normalizeDecimalsToIntegers(arr: number[]): number[] {
  let maxDecimalPlaces = Math.max(
    ...arr.map((num) => num.toString().split('.')[1]?.length ?? 0)
  );

  if (maxDecimalPlaces == 0) return arr;

  // multiply each number by a power of 10 equal to the max number of decimal places, then convert to integer
  maxDecimalPlaces = Math.min(2, maxDecimalPlaces);
  const result = arr.map((num) =>
    Math.round(num * Math.pow(10, maxDecimalPlaces))
  );

  return result;
}

export function roundUpToNextPowerOfTen(num: number): number {
  return Math.pow(10, Math.ceil(Math.log10(num)));
}

export function recursiveDivideByTen(arr: number[]): number[] {
  const result: number[] = [];

  for (const num of arr) {
    if (num % 10 !== 0) return arr;
    result.push(num / 10);
  }

  return recursiveDivideByTen(result);
}

export function binaryFindIndex<T>(arr: T[], sval: T): number {
  let [lowerBound, upperBound] = [0, arr.length - 1];

  while (lowerBound <= upperBound) {
    const midx = Math.floor((upperBound - lowerBound) / 2) + lowerBound;
    const mval = arr[midx]!;
    if (sval == mval) return midx;
    if (sval > mval) lowerBound = midx + 1;
    if (sval < mval) upperBound = midx - 1;
  }

  // `lowerBound` is now the index where `sval` would
  // need to be inserted while keeping the array sorted
  return lowerBound;
}
