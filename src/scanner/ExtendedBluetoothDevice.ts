'use strict';

import { LockType } from "../constant/LockType";

export class ExtendedBluetoothDevice {
  device: any;
  scanRecord: Buffer = Buffer.from([]);
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
  
  constructor(id: string, name: string, rssi: number, scanRecord: Buffer, device?: any) {
    this.device = device;
    this.id = id;
    // this.uuid = peripheral.uuid;
    this.name = name;
    this.rssi = rssi;
    this.scanRecord = scanRecord;

    var index = 0;
    var nameIsScienerDfu = false; // ?????
    var abort = false;
    const buffer = this.scanRecord;
    if (buffer && buffer.length > 0) {
      while (index < buffer.length && !abort) {
        const length = buffer.readUInt8(index); // unsigned
        if (length == 0) break;
        const adtype = buffer.readInt8(index + 1); // signed
        switch (adtype) {
          case 9: // name
            this.name = buffer.toString('utf8', index + 2, index + 2 + length - 1);
            if (this.name == "ScienerDfu") {
              nameIsScienerDfu = true;
            } else if (this.name.substr(0, 5) == "LOCK_") {
              this.isRoomLock = true;
            }
            break;
          case -1:
            var offset = 2;
            this.protocolType = buffer.readInt8(index + offset++);
            this.protocolVersion = buffer.readInt8(index + offset++);
            if (this.protocolType == 18 && this.protocolVersion == 25) {
              this.isDfuMode = true;
              abort = true;
              break;
            }
            if (this.protocolType == -1 && this.protocolVersion == -1) {
              this.isDfuMode = true;
              abort = true;
              break;
            }
            if (this.protocolType == 52 && this.protocolVersion == 18) {
              this.isWristband = true;
            }
            if (this.protocolType == 5 && this.protocolVersion == 3) {
              this.scene = buffer.readInt8(index + offset++);
            } else {
              offset = 6;
              this.protocolType = buffer.readInt8(index + offset++);
              this.protocolVersion = buffer.readInt8(index + offset);
              offset = 9;
              this.scene = buffer.readInt8(index + offset++);
            }
            if (this.protocolType < 5 || this.getLockType() == LockType.LOCK_TYPE_V2S) {
              this.isRoomLock = true;
              abort = true;
              break;
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
            const params = buffer.readInt8(index + offset);
            this.isUnlock = ((params & 0x1) == 0x1);
            this.isSettingMode = ((params & 0x4) != 0x0);
            if (this.getLockType() == LockType.LOCK_TYPE_V3 || this.getLockType() == LockType.LOCK_TYPE_V3_CAR) {
              this.isTouch = ((params && 0x8) != 0x0);
            } else if (this.getLockType() == LockType.LOCK_TYPE_V2S_PLUS) {
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
            this.batteryCapacity = buffer.readInt8(index + offset);
            offset += 3;
            const macBuf = buffer.slice(index + offset, index + offset + 6);
            var macArr: string[] = [];
            macBuf.forEach((m: number) => {
              macArr.push(m.toString(16));
            });
            macArr.reverse();
            this.mAddress = macArr.join(':').toUpperCase();
            break;
          case 10: // power level
            this.txPowerLevel = buffer.readInt8(index + 2);
            break;
        }
        index += length + 1;
      }
    }
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
