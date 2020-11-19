'use strict';

/** TODO: use Buffers */

import { dscrc_table } from "./dscrc_table";

export class CodecUtils {
  static encodeWithEncrypt(p0: number[], key?: number): number[] {
    var seed;
    if (key) {
      seed = key;
    } else {
      // generate a random number from 1 to 127
      seed = Math.round(Math.random() * 126) + 1;
    }

    var encoded = [];
    const crc = dscrc_table[p0.length & 0xff];

    for (var i = 0; i < p0.length; i++) {
      encoded.push(seed ^ p0[i] ^ crc);
    }
    if (!key) {
      encoded.push(seed);
    }

    return encoded;
  }

  static encode(p0: number[]): number[] {
    return CodecUtils.encodeWithEncrypt(p0);
  }

  static decodeWithEncrypt(p0: number[], key?: number): number[] {
    var seed;
    if (key) {
      seed = key;
    } else {
      // generate a random number from 1 to 127
      seed = Math.round(Math.random() * 126) + 1;
    }

    var encoded = [];
    const crc = dscrc_table[p0.length & 0xff];

    for (var i = 0; i < p0.length; i++) {
      encoded.push(seed ^ p0[i] ^ crc);
    }
    if (!key) {
      encoded.push(seed);
    }

    return encoded;
  }

  static decode(p0: number[]): number[] {
    return CodecUtils.decodeWithEncrypt(p0);
  }

  static crccompute(p0: number[]): number {
    var crc = 0;
    for (var i = 0; i < p0.length; i++) {
      crc = dscrc_table[crc ^ p0[i]];
    }
    return crc;
  }
}
