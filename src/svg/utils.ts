export function toTrainCase(camelCaseString: string) {
  return camelCaseString.replace(
    /([a-z])([A-Z])/g,
    (_, a, b) => `${a}-${b.toLowerCase()}`
  );
}

export function isEmptyObject(obj: Record<any, any>) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }
  return true;
}
