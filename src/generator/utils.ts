export function mergeObjectsRecursively(
  obj1: Record<any, any>,
  obj2: Record<any, any>
) {
  for (const p in obj2) {
    if (obj2[p]?.constructor === Object) {
      obj1[p] = mergeObjectsRecursively(obj1[p], obj2[p]);
    } else {
      obj1[p] = obj2[p];
    }
  }

  return obj1;
}
