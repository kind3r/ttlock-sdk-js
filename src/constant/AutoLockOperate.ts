'use strict';

export enum AutoLockOperate {
  /**
   * Query blocking time
   */
  SEARCH = 0x01,
  /**
   * Modify the blocking time
   */
  MODIFY = 0x02,
}