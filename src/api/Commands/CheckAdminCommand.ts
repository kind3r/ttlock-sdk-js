'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class CheckAdminCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_CHECK_ADMIN;

  private uid: number = 0;
  private adminPs?: number;
  private lockFlagPos: number = 0;

  protected processData(): void {
    // nothing to do, all incomming data is the 'token'
  }

  build(): Buffer {
    if (typeof this.adminPs != "undefined") {
      const data = Buffer.alloc(11);
      data.writeUInt32BE(this.lockFlagPos, 3); // 4 bytes (first one overlaps with adminPs)
      data.writeUInt32BE(this.adminPs, 0); // 4 bytes
      data.writeUInt32BE(this.uid, 7);
      return data;
    } else {
      return Buffer.from([]);
    }
  }

  setParams(adminPs: number) {
    this.adminPs = adminPs;
  }

  getPsFromLock(): number {
    if(this.commandData) {
      return this.commandData.readUInt32BE(0);
    } else {
      return -1;
    }
  }
}