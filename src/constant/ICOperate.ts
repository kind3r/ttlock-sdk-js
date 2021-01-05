'use strict';

export enum ICOperate {
  IC_SEARCH = 1,
  FR_SEARCH = 6,
  ADD = 2,
  DELETE = 3,
  CLEAR = 4,
  MODIFY = 5,

  /**
   * Fingerprint template data package
   */
  WRITE_FR = 7,

  STATUS_ADD_SUCCESS = 0x01,
  STATUS_ENTER_ADD_MODE = 0x02,
  STATUS_FR_PROGRESS = 0x03,
  STATUS_FR_RECEIVE_TEMPLATE = 0x04,
}