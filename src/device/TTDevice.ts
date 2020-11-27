'use strict';

import { LockType } from "../constant/Lock";

export class TTDevice {
  id: string = "";
  uuid: string = "";
  name: string = "";
  manufacturer: string = "unknown";
  model: string = "unknown";
  hardware: string = "unknown";
  firmware: string = "unknown";
  address: string = "";
  rssi: number = 0;
  /** @type {byte} */
  protocolType: number = 0;
  /** @type {byte} */
  protocolVersion: number = 0;
  /** @type {byte} */
  scene: number = 0;
  /** @type {byte} */
  groupId: number = 0;
  /** @type {byte} */
  orgId: number = 0;
  /** @type {byte} */
  lockType: LockType = LockType.UNKNOWN;
  isTouch: boolean = false;
  isSettingMode: boolean = false;
  isUnlock: boolean = false;
  /** @type {byte} */
  txPowerLevel: number = 0;
  /** @type {byte} */
  batteryCapacity: number = -1;
  /** @type {number} */
  date: number = 0;
  isWristband: boolean = false;
  isRoomLock: boolean = false;
  isSafeLock: boolean = false;
  isBicycleLock: boolean = false;
  isLockcar: boolean = false;
  isGlassLock: boolean = false;
  isPadLock: boolean = false;
  isCyLinder: boolean = false;
  isRemoteControlDevice: boolean = false;
  isDfuMode: boolean = false;
  isNoLockService: boolean = false;
  remoteUnlockSwitch: number = 0;
  disconnectStatus: number = 0;
  parkStatus: number = 0;

  aesKey: Buffer = Buffer.from([]);

  toJSON() {
    const temp = new TTDevice();
    var json = {};
    
    Object.getOwnPropertyNames(temp).forEach((key) => {
      const val = Reflect.get(this, key);
      if (typeof val != 'undefined' && ((typeof val == "string" && val != "") || typeof val != "string")) {
        if ((typeof val) == "object") {
          if (val.length && val.length > 0) {
            Reflect.set(json, key, val.toString('hex'));
          }
        } else {
          Reflect.set(json, key, val);
        }
      }
    });

    return JSON.stringify(json);
  }
}