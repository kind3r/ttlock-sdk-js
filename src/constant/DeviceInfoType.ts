'use strict';

export enum DeviceInfoType {
  /**
   * Product number
   */
  MODEL_NUMBER = 1,

  /**
   * Hardware version number
   */
  HARDWARE_REVISION = 2,

  /**
   * Firmware version number
   */
  FIRMWARE_REVISION = 3,

  /**
   * Production Date
   */
  MANUFACTURE_DATE = 4,

  /**
   * Bluetooth address
   */
  MAC_ADDRESS = 5,

  /**
   * Clock
   */
  LOCK_CLOCK = 6,

  /**
   * Operator information
   */
  NB_OPERATOR = 7,

  /**
   * NB module number (IMEI)
   */
  NB_IMEI = 8,

  /**
   * NB card information
   */
  NB_CARD_INFO = 9,

  /**
   * NB signal value
   */
  NB_RSSI = 10,
}