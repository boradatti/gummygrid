export function toTrainCase(camelCaseString: string) {
  return camelCaseString.replace(
    /([a-z])([A-Z])/g,
    (_, a, b) => `${a}-${b.toLowerCase()}`
  );
}
