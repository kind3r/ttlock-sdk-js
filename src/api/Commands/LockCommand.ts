'use strict';

import moment from "moment";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";
import { UnlockDataInterface } from "./UnlockCommand";

export class LockCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_FUNCTION_LOCK;

  private sum?: number;
  private uid?: number;
  private uniqueid?: number;
  private dateTime?: string;
  private batteryCapacity?: number;

  protected processData(): void {
    if (this.commandData && this.commandData.length > 0) {
      this.batteryCapacity = this.commandData.readUInt8(0);
      if (this.commandData.length >= 15) {
        this.uid = this.commandData.readUInt32BE(1);
        this.uniqueid = this.commandData.readUInt32BE(5);
        const dateObj = {
          year: 2000 + this.commandData.readUInt8(9),
          month: this.commandData.readUInt8(10) - 1,
          day: this.commandData.readUInt8(11),
          hour: this.commandData.readUInt8(12),
          minute: this.commandData.readUInt8(13),
          second: this.commandData.readUInt8(14)
        }
        this.dateTime = moment(dateObj).format("YYMMDDHHmmss");
      }
    }
  }

  build(): Buffer {
    if (this.sum) {
      const data = Buffer.alloc(8);
      data.writeUInt32BE(this.sum, 0);
      data.writeUInt32BE(moment().unix(), 4);
      return data;
    }
    return Buffer.from([]);
  }

  setSum(psFromLock: number, unlockKey: number) {
    this.sum = psFromLock + unlockKey;
  }

  getUnlockData(): UnlockDataInterface {
    const data: UnlockDataInterface = {
      uid: this.uid,
      uniqueid: this.uniqueid,
      dateTime: this.dateTime,
      batteryCapacity: this.batteryCapacity
    }
    return data;
  }

  getBatteryCapacity(): number {
    if (this.batteryCapacity) {
      return this.batteryCapacity;
    } else {
      return -1;
    }
  }
}