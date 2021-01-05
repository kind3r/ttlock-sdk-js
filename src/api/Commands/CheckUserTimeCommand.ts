'use strict';

import { CommandType } from "../../constant/CommandType";
import { dateTimeToBuffer } from "../../util/timeUtil";
import { Command } from "../Command";

export class CheckUserTimeCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_CHECK_USER_TIME;

  private uid?: number;
  private startDate?: string;
  private endDate?: string;
  private lockFlagPos?: number;

  protected processData(): void {
    // nothing to do
  }

  build(): Buffer {
    if (typeof this.uid != "undefined" && this.startDate && this.endDate && typeof this.lockFlagPos != "undefined") {
      const data = Buffer.alloc(17); //5+5+3+4
      dateTimeToBuffer(this.startDate).copy(data, 0);
      data.writeUInt32BE(this.lockFlagPos, 9); // overlap first byte
      dateTimeToBuffer(this.endDate).copy(data, 5);
      data.writeUInt32BE(this.uid, 13);
      return data;
    }
    return Buffer.from([]);
  }

  setPayload(uid: number, startDate: string, endDate: string, lockFlagPos: number) {
    this.uid = uid;
    this.startDate = startDate;
    this.endDate = endDate;
    this.lockFlagPos = lockFlagPos;
  }

  getPsFromLock(): number {
    if (this.commandData) {
      return this.commandData.readUInt32BE(0);
    } else {
      return -1;
    }
  }
}