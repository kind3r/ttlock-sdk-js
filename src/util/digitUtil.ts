'use strict';

export function padHexString(s: string): string {
  if (s.length % 2 != 0) {
    return "0" + s;
  } else {
    return s;
  }
}