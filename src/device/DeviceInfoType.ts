'use strict';

export declare type DeviceInfoType = {
  /**
   * hex feature
   */
  featureValue: string;

  /**
   * Product model(e.g. "M201")
   */
  modelNum: string;
  /**
   * Hardware version(e.g. "1.3")
   */
  hardwareRevision: string;
  /**
   * Firmware version(e.g. "2.1.16.705")
   */
  firmwareRevision: string;
  /**
   * NB lock IMEI
   */
  nbNodeId: string;

  /**
   * NB operator
   */
  nbOperator: string;

  /**
   * NB lock card info
   */
  nbCardNumber: string;
  /**
   * NB lock rssi
   */
  nbRssi: number;
  /**
   * Date of manufacture(e.g. "20160707")
   */
  factoryDate: string;
  /**
   * lock clock(e.g. "1701051531") yymmddhhmm
   */
  lockClock: string;
}
