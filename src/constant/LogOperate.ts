'use strict';

export enum LogOperate {
  //Phone unlock
  /**
   * Bluetooth unlock
   */
  OPERATE_TYPE_MOBILE_UNLOCK = 1,

  // //Server unlock
  // OPERATE_TYPE_SERVER_UNLOCK = 3,

  //Password unlock
  OPERATE_TYPE_KEYBOARD_PASSWORD_UNLOCK = 4,

  //Change the password on the keyboard
  OPERATE_TYPE_KEYBOARD_MODIFY_PASSWORD = 5,

  //Delete a single password on the keyboard
  OPERATE_TYPE_KEYBOARD_REMOVE_SINGLE_PASSWORD = 6,

  //Wrong password unlock
  OPERATE_TYPE_ERROR_PASSWORD_UNLOCK = 7,

  //Delete all passwords on the keyboard
  OPERATE_TYPE_KEYBOARD_REMOVE_ALL_PASSWORDS = 8,

  //The password is squeezed out
  OPERATE_TYPE_KEYBOARD_PASSWORD_KICKED = 9,

  /**
   * The password with the delete function is unlocked for the first time, and the previous password is cleared
   */
  OPERATE_TYPE_USE_DELETE_CODE = 10,

  /**
   * Password expired
   */
  OPERATE_TYPE_PASSCODE_EXPIRED = 11,

  /**
   * The password unlock failed, and the storage capacity is insufficient
   */
  OPERATE_TYPE_SPACE_INSUFFICIENT = 12,

  /**
   * Password unlock failed—the password is in the blacklist
   */
  OPERATE_TYPE_PASSCODE_IN_BLACK_LIST = 13,

  /**
   * The door lock is powered on again (that is, the battery is reconnected)
   */
  OPERATE_TYPE_DOOR_REBOOT = 14,

  /**
   * Add IC card successfully
   */
  OPERATE_TYPE_ADD_IC = 15,

  /**
   * Successfully emptied the IC card
   */
  OPERATE_TYPE_CLEAR_IC_SUCCEED = 16,

  /**
   * IC card opened successfully
   */
  OPERATE_TYPE_IC_UNLOCK_SUCCEED = 17,

  /**
   * Delete a single IC card successfully
   */
  OPERATE_TYPE_DELETE_IC_SUCCEED = 18,

  /**
   * Bong bracelet opened the door successfully
   */
  OPERATE_TYPE_BONG_UNLOCK_SUCCEED = 19,

  /**
   * Fingerprint opens the door successfully
   */
  OPERATE_TYPE_FR_UNLOCK_SUCCEED = 20,

  /**
   * The fingerprint is added successfully
   */
  OPERATE_TYPE_ADD_FR = 21,

  /**
   * Fingerprint opening failed
   */
  OPERATE_TYPE_FR_UNLOCK_FAILED = 22,

  /**
   * Delete a single fingerprint successfully
   */
  OPERATE_TYPE_DELETE_FR_SUCCEED = 23,

  /**
   * Clear fingerprints successfully
   */
  OPERATE_TYPE_CLEAR_FR_SUCCEED = 24,

  /**
   * IC card failed to open the door-expired or not valid
   */
  OPERATE_TYPE_IC_UNLOCK_FAILED = 25,

  /**
   * Bluetooth or net closed lock
   */
  OPERATE_BLE_LOCK = 26,

  /**
   * Mechanical key unlock
   */
  OPERATE_KEY_UNLOCK = 27,

  /**
   * Gateway unlock
   */
  GATEWAY_UNLOCK = 28,

  /**
   * Illegal unlocking (such as pedaling)
   */
  ILLAGEL_UNLOCK = 29,

  /**
   * Close the door sensor
   */
  DOOR_SENSOR_LOCK = 30,

  /**
   * Door sensor open
   */
  DOOR_SENSOR_UNLOCK = 31,

  /**
   * Outgoing records
   */
  DOOR_GO_OUT = 32,

  /**
   * Fingerprint lock
   */
  FR_LOCK = 33,

  /**
   * Password lock
   */
  PASSCODE_LOCK = 34,

  IC_LOCK = 35,

  /**
   * Mechanical key lock
   */
  OPERATE_KEY_LOCK = 36,

  /**
   * Remote control button
   */
  REMOTE_CONTROL_KEY = 37,

  /**
   * Password unlock failed, the door is locked
   */
  PASSCODE_UNLOCK_FAILED_LOCK_REVERSE = 38,

  /**
   * The IC card fails to unlock and the door is locked
   */
  IC_UNLOCK_FAILED_LOCK_REVERSE = 39,

  /**
   * Fingerprint unlocking fails, the door is locked
   */
  FR_UNLOCK_FAILED_LOCK_REVERSE = 40,

  /**
   * The app fails to unlock and the door is locked
   */
  APP_UNLOCK_FAILED_LOCK_REVERSE = 41,

  //42 ~ 48 no parameters

  /**
   * Wireless key
   */
  WIRELESS_KEY_FOB = 55,

  /**
   * Wireless keyboard battery
   */
  WIRELESS_KEY_PAD = 56,
}