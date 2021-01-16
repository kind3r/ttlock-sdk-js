'use strict';

import { AutoLockOperate } from "../../constant/AutoLockOperate";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class AutoLockManageCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_AUTO_LOCK_MANAGE;

  private opType: AutoLockOperate.SEARCH | AutoLockOperate.MODIFY = AutoLockOperate.SEARCH;
  private opValue?: number;
  private batteryCapacity?: number;
  
  protected processData(): void {
    if (this.commandData && this.commandData.length >= 4) {
      // 0 - battery
      // 1 - opType
      // 2,3 - opValue
      // 4,5 - min value
      // 6,7 - max value
      this.batteryCapacity = this.commandData.readUInt8(0);
      this.opType = this.commandData.readUInt8(1);
      if (this.opType == AutoLockOperate.SEARCH) {
        this.opValue = this.commandData.readUInt16BE(2);
      } else {

      }
    }
  }
  build(): Buffer {
    if (this.opType == AutoLockOperate.SEARCH) {
      return Buffer.from([this.opType]);
    } else if (typeof this.opValue != "undefined") {
      return Buffer.from([
        this.opType,
        this.opValue >> 8,
        this.opValue
      ]);
    } else {
      return Buffer.from([]);
    }
  }

  setTime(opValue: number) {
    this.opValue = opValue;
    this.opType = AutoLockOperate.MODIFY;
  }

  getTime(): number {
    if (typeof this.opValue != "undefined") {
      return this.opValue;
    } else {
      return -1;
    }
  }

  getBatteryCapacity(): number {
    if (this.batteryCapacity) {
      return this.batteryCapacity;
    } else {
      return -1;
    }
  }
}