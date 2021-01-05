'use strict';

export enum PwdOperateType {
  /**
   * Clear keyboard password
   */
  PWD_OPERATE_TYPE_CLEAR = 1,

  /**
   * Add keyboard password
   */
  PWD_OPERATE_TYPE_ADD = 2,

  /**
   * Delete a single keyboard password
   */
  PWD_OPERATE_TYPE_REMOVE_ONE = 3,

  /**
   * Change the keyboard password (the old one is 4, no longer used)
   */
  PWD_OPERATE_TYPE_MODIFY = 5,

  /**
   * Recovery password
   */
  PWD_OPERATE_TYPE_RECOVERY = 6,
}