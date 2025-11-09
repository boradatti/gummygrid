export function isObject(item: unknown) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// @ts-ignore
export function mergeObjectsRecursively(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        // ! hope this won't break things
        if (!target[key] || typeof target[key] !== 'object')
          Object.assign(target, { [key]: {} });
        mergeObjectsRecursively(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeObjectsRecursively(target, ...sources);
}
