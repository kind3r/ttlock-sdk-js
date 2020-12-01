'use strict';

import { AutoLockOperate } from "../../constant/AutoLockOperate";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class AutoLockManageCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_AUTO_LOCK_MANAGE;

  private opType: AutoLockOperate.SEARCH | AutoLockOperate.MODIFY = AutoLockOperate.SEARCH;
  private opValue?: number;
  
  protected processData(): void {
    if (this.commandData) {
      // 2 - battery
      // 3 - opType
      // 4,5 - opValue
      // 6,7 - min value
      // 8,9 - max value
      this.opType = this.commandData?.readUInt8(3);
      if (this.opType == AutoLockOperate.SEARCH) {
        this.opValue = this.commandData.readUInt16BE(4);
      } else {

      }
    }
  }
  build(): Buffer {
    if (this.opType == AutoLockOperate.SEARCH) {
      return Buffer.from([this.opType]);
    } else if (this.opValue) {
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

  getTime(): number | undefined {
    if (this.opValue) {
      return this.opValue;
    }
  }
}