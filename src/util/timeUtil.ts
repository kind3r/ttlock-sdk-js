'use strict';

export function dateTimeToBuffer(dateTime: string): Buffer {
  const result = Buffer.alloc(dateTime.length/2);
  for (let i = 0; i < result.length; i++) {
    result[i] = parseInt(dateTime.substring(i * 2, i * 2 + 2));
  }
  return result;
}