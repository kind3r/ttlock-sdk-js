'use strict';

import { LockType } from "../constant/LockType";

export class ExtendedBluetoothDevice {
  static GAP_ADTYPE_LOCAL_NAME_COMPLETE = 0X09;	//!< Complete local name
  static GAP_ADTYPE_POWER_LEVEL = 0X0A;	//!< TX Power Level: 0xXX: -127 to +127 dBm
  static GAP_ADTYPE_MANUFACTURER_SPECIFIC = 0XFF; //!< Manufacturer Specific Data: first 2 octets contain the Company Inentifier Code followed by the additional manufacturer specific data

  device: any;
  id: string = "";
  uuid: string = "";
  name: string = "";
  mAddress: string = "";
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

  constructor(id: string, name: string, rssi: number, manufacturerData: Buffer, device?: any) {
    if(device) {
      this.device = device;
    }
    this.id = id;
    this.name = name;
    this.rssi = rssi;
    this.parseManufacturerData(manufacturerData);
  }

  /** Maybe we will use this to manually parse the raw BLE data ? */
  parseScanRecord(scanRecord: Buffer) {
    var index = 0;
    var nameIsScienerDfu = false; // ?????
    var abort = false;
    const buffer = scanRecord;
    if (buffer && buffer.length > 0) {
      while (index < buffer.length && !abort) {
        const length = buffer.readUInt8(index); // unsigned
        if (length == 0) break; // ?
        const adtype = buffer.readUInt8(index + 1); // unsigned
        const ad = buffer.slice(index + 2, index + 2 + length - 1);
        switch (adtype) {
          case ExtendedBluetoothDevice.GAP_ADTYPE_LOCAL_NAME_COMPLETE: // name
            this.name = ad.toString("utf8");
            if (this.name == "ScienerDfu") {
              nameIsScienerDfu = true;
            } else if (this.name.substr(0, 5) == "LOCK_") {
              this.isRoomLock = true;
            }
            break;
          case ExtendedBluetoothDevice.GAP_ADTYPE_MANUFACTURER_SPECIFIC:
            this.parseManufacturerData(ad);
            break;
          case ExtendedBluetoothDevice.GAP_ADTYPE_POWER_LEVEL: // power level
            this.txPowerLevel = ad.readInt8();
            break;
        }
        index += length + 1;
      }
    }
  }

  parseManufacturerData(manufacturerData: Buffer) {
    // TODO: check offset is within the limits of the Buffer
    var offset = 0;
    this.protocolType = manufacturerData.readInt8(offset++);
    this.protocolVersion = manufacturerData.readInt8(offset++);
    if (this.protocolType == 18 && this.protocolVersion == 25) {
      this.isDfuMode = true;
      return;
    }
    if (this.protocolType == -1 && this.protocolVersion == -1) {
      this.isDfuMode = true;
      return;
    }
    if (this.protocolType == 52 && this.protocolVersion == 18) {
      this.isWristband = true;
    }
    if (this.protocolType == 5 && this.protocolVersion == 3) {
      this.scene = manufacturerData.readInt8(offset++);
    } else {
      offset = 4;
      this.protocolType = manufacturerData.readInt8(offset++);
      this.protocolVersion = manufacturerData.readInt8(offset++);
      offset = 7;
      this.scene = manufacturerData.readInt8(offset++);
    }
    if (this.protocolType < 5 || this.getLockType() == LockType.LOCK_TYPE_V2S) {
      this.isRoomLock = true;
      return;
    }
    if (this.scene <= 3) {
      this.isRoomLock = true;
    } else {
      switch (this.scene) {
        case 4: {
          this.isGlassLock = true;
          break;
        }
        case 5:
        case 11: {
          this.isSafeLock = true;
          break;
        }
        case 6: {
          this.isBicycleLock = true;
          break;
        }
        case 7: {
          this.isLockcar = true;
          break;
        }
        case 8: {
          this.isPadLock = true;
          break;
        }
        case 9: {
          this.isCyLinder = true;
          break;
        }
        case 10: {
          if (this.protocolType == 5 && this.protocolVersion == 3) {
            this.isRemoteControlDevice = true;
            break;
          }
          break;
        }
      }
    }
    const params = manufacturerData.readInt8(offset);
    this.isUnlock = ((params & 0x1) == 0x1);
    this.isSettingMode = ((params & 0x4) != 0x0);
    if (this.getLockType() == LockType.LOCK_TYPE_V3 || this.getLockType() == LockType.LOCK_TYPE_V3_CAR) {
      this.isTouch = ((params && 0x8) != 0x0);
    } else if (this.getLockType() == LockType.LOCK_TYPE_CAR) {
      this.isTouch = false;
      this.isLockcar = true;
    }
    if (this.isLockcar) {
      if (this.isUnlock) {
        if ((params & 0x10) == 0x1) {
          this.parkStatus = 3;
        } else {
          this.parkStatus = 2;
        }
      } else if ((params & 0x10) == 0x1) {
        this.parkStatus = 1;
      } else {
        this.parkStatus = 0;
      }
    }
    offset++;
    this.batteryCapacity = manufacturerData.readInt8(offset);
    // offset += 3 + 4; // Offset in original SDK is + 3, but in scans it's actually +4
    offset = manufacturerData.length - 6; // let's just get the last 6 bytes
    const macBuf = manufacturerData.slice(offset, offset + 6);
    console.log(offset, macBuf);
    var macArr: string[] = [];
    macBuf.forEach((m: number) => {
      macArr.push(m.toString(16));
    });
    macArr.reverse();
    this.mAddress = macArr.join(':').toUpperCase();
  }

  getLockType(): LockType {
    if (this.protocolType == 5 && this.protocolVersion == 3 && this.scene == 7) {
      this.lockType = LockType.LOCK_TYPE_V3_CAR;
    }
    else if (this.protocolType == 10 && this.protocolVersion == 1) {
      this.lockType = LockType.LOCK_TYPE_CAR;
    }
    else if (this.protocolType == 11 && this.protocolVersion == 1) {
      this.lockType = LockType.LOCK_TYPE_MOBI;
    }
    else if (this.protocolType == 5 && this.protocolVersion == 4) {
      this.lockType = LockType.LOCK_TYPE_V2S_PLUS;
    }
    else if (this.protocolType == 5 && this.protocolVersion == 3) {
      this.lockType = LockType.LOCK_TYPE_V3;
    }
    else if ((this.protocolType == 5 && this.protocolVersion == 1) || (this.name != null && this.name.toUpperCase().startsWith("LOCK_"))) {
      this.lockType = LockType.LOCK_TYPE_V2S;
    }
    return this.lockType;
  }
}
