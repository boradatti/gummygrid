export class Randomizer {
  private seed: string;
  private hash: number;
  private readonly salt: number;

  constructor(salt: number = 0) {
    this.seed = '';
    this.hash = 0;
    this.salt = salt;
    this.bumpHash(this.salt);
  }

  setSeed(str: string): void {
    this.seed = str;
    this.setHash();
  }

  number(min: number, max: number): number {
    const number = this.getRandomNumber(min, max);
    this.updateHash();
    return number;
  }

  boolean(bias?: number): boolean {
    if (bias !== undefined)
      return (
        this.choiceWeighted([1, 0], [bias, this.getInverseBias(bias)]) == 1
      );
    return this.number(0, 1) == 1;
  }

  choice<T>(arr: T[], weights?: number[]): T {
    if (arr.length == 0) throw new Error('Cannot choose from an empty array');
    if (arr.length == 1) return arr[0]!;
    if (weights) return this.choiceWeighted(arr, weights);
    return arr[this.number(0, arr.length - 1)]!;
  }

  getChoiceIndex<T>(arr: T[], weights?: number[]): number {
    if (arr.length == 0) throw new Error('Cannot choose from an empty array');
    if (arr.length == 1) return 0;
    if (weights) return this.choiceWeightedIndex(arr, weights).idx;
    return this.number(0, arr.length - 1);
  }

  private choiceWeighted<T>(arr: T[], weights: number[]): T {
    const { arr: filteredArr, idx } = this.choiceWeightedIndex(arr, weights);
    return filteredArr[idx]!;
  }

  private choiceWeightedIndex<T>(
    arr: T[],
    weights: number[]
  ): { idx: number; arr: T[] } {
    if (arr.length !== weights.length)
      throw new Error(
        `Length of \`weights\` must equal that of \`arr\` (${arr.length})`
      );

    weights = this.normalizeWeights(weights);

    let totalWeight: number = 0;
    const cumulativeWeights: number[] = [];
    const filteredArr: T[] = [];
    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i]!;
      if (weight == 0) continue; // drop zero weights
      cumulativeWeights.push((totalWeight += weight));
      filteredArr.push(arr[i]!);
    }

    const randomWeight = this.number(1, totalWeight);
    const idx = binaryFindIndex(cumulativeWeights, randomWeight);

    return { idx, arr: filteredArr };
  }

  private setHash(): void {
    this.hash = 0;
    for (let i = 0; i < this.seed.length; i++) {
      let charCode = this.seed.charCodeAt(i);
      this.bumpHash(charCode);
    }
    this.bumpHash(this.salt);
  }

  private bumpHash(number: number): void {
    this.hash = (this.hash << 5) - this.hash + number;
    this.hash |= 0;
  }

  private updateHash(): void {
    this.bumpHash(this.getRandomNumber(1, 999));
  }

  private getRandomNumber(min: number, max: number): number {
    const absHash = Math.abs(this.hash);
    return (absHash % (max - min + 1)) + min;
  }

  private normalizeWeights(arr: number[]): number[] {
    arr = normalizeDecimalsToIntegers(arr);
    arr = recursiveDivideByTen(arr);
    return arr;
  }

  private getInverseBias(bias: number): number {
    if (bias < 1) return 1 - bias;
    return roundUpToNextPowerOfTen(bias) - bias;
  }
}

// * algorithmic & math utils

function normalizeDecimalsToIntegers(arr: number[]): number[] {
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

function roundUpToNextPowerOfTen(num: number): number {
  return Math.pow(10, Math.ceil(Math.log10(num)));
}

function recursiveDivideByTen(arr: number[]): number[] {
  const result: number[] = [];

  for (const num of arr) {
    if (num % 10 !== 0) return arr;
    result.push(num / 10);
  }

  return recursiveDivideByTen(result);
}

function binaryFindIndex<T>(arr: T[], sval: T): number {
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
