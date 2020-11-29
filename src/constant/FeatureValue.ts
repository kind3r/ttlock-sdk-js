'use strict';

export enum FeatureValue {
  /**
   * Password
   */
  PASSCODE = 0,

  /**
   * CARD
   */
  IC = 1,

  /**
   * Fingerprint
   */
  FINGER_PRINT = 2,

  /**
   * wristband
   */
  WRIST_BAND = 3,

  /**
   * Automatic locking function
   */
  AUTO_LOCK = 4,

  /**
   * Password with delete function
   */
  PASSCODE_WITH_DELETE_FUNCTION = 5,

  /**
   * Support firmware upgrade setting instructions
   */
  FIRMWARE_SETTTING = 6,

  /**
   * Modify password (custom) function
   */
  MODIFY_PASSCODE_FUNCTION = 7,

  /**
   * Blocking instruction
   */
  MANUAL_LOCK = 8,

  /**
   * Support password display or hide
   */
  PASSWORD_DISPLAY_OR_HIDE = 9,

  /**
   * Support gateway unlock command
   */
  GATEWAY_UNLOCK = 10,

  /**
   * Support gateway freeze and unfreeze instructions
   */
  FREEZE_LOCK = 11,

  /**
   * Support cycle password
   */
  CYCLIC_PASSWORD = 12,

  /**
   * Support door sensor
   */
  MAGNETOMETER = 13,

   /**
   * Support remote unlocking configuration
   */
  CONFIG_GATEWAY_UNLOCK = 14,

  /**
   * Audio management
   */
  AUDIO_MANAGEMENT = 15,

  /**
   * Support NB
   */
  NB_LOCK = 16,

// /**
// * Support hotel lock card system
// */
// @Deprecated
// HOTEL_LOCK = 0x20000,

  /**
   * Support reading the administrator password
   */
  GET_ADMIN_CODE = 18,

  /**
   * Support hotel lock card system
   */
  HOTEL_LOCK = 19,

  /**
   * Lock without clock chip
   */
  LOCK_NO_CLOCK_CHIP = 20,

  /**
   * Bluetooth does not broadcast, and it cannot be realized by clicking on the app to unlock
   */
  CAN_NOT_CLICK_UNLOCK = 21,

  /**
   * Support the normal open mode from a few hours to a few hours on a certain day
   */
  PASSAGE_MODE = 22,

  /**
   * In the case of supporting the normally open mode and setting the automatic lock, whether to support the closing of the automatic lock
   */
  PASSAGE_MODE_AND_AUTO_LOCK_AND_CAN_CLOSE = 23,

  WIRELESS_KEYBOARD = 24,

  /**
   * flashlight
   */
  LAMP = 25,

  /**
   * Anti-tamper switch configuration
   */
  TAMPER_ALERT = 28,

  /**
   * Reset key configuration
   */
  RESET_BUTTON = 29,

  /**
   * Anti-lock
   */
  PRIVACK_LOCK = 30,

  /**
   * Deadlock (the original 31 is not used)
   */
  DEAD_LOCK = 32,

  /**
   * Support normally open mode exception
   */
// PASSAGE_MODE_ = 33,

  CYCLIC_IC_OR_FINGER_PRINT = 34,

  NB_ACTIVITE_CONFIGURATION = 39,
}