'use strict';

/**
 * Recursively converts all buffers to hex string in an object
 * @param json Object to convert Buffers to string
 */
export function stringifyBuffers(json: Object): Object {
  if((json instanceof Set) || (json instanceof Map)) {
    return json;
  }
  Object.getOwnPropertyNames(json).forEach((key) => {
    const val = Reflect.get(json, key);
    if (typeof val == "object" && val instanceof Buffer) {
      Reflect.set(json, key, val.toString('hex'));
    } else if (typeof val == "object") {
      Reflect.set(json, key, stringifyBuffers(val));
    } else {
      // Reflect.set(json, key, val);
    }
  });
  return json;
}