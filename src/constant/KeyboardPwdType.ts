'use strict';

export enum KeyboardPwdType {
  /**
   * Unlimited
   */
  PWD_TYPE_PERMANENT = 1,

  /**
   * Limited times
   */
  PWD_TYPE_COUNT = 2,

  /**
   * Limited time
   */
  PWD_TYPE_PERIOD = 3,

  /**
   * Loop
   */
  PWD_TYPE_CIRCLE = 4,
}