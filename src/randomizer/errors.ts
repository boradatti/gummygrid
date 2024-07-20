export class WeightLengthMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeightLengthMismatchError';
  }
}
