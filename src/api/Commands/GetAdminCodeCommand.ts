'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class GetAdminCodeCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_GET_ADMIN_CODE;

  private adminPasscode?: string;

  protected processData(): void {
    if (this.commandData) {
      const len = this.commandData.readUInt8(1);
      if (len != this.commandData.length - 2) {
        console.error("GetAdminCodeCommand: data size (" + this.commandData.length + ") does not match declared length(" + len + ")");
      }
      if (len > 0) {
        this.adminPasscode = this.commandData.subarray(2, this.commandData.length - 2).toString();
      } else {
        this.adminPasscode = "";
      }
    }
  }

  build(): Buffer {
    return Buffer.from([]);
  }

  getAdminPasscode(): string | undefined {
    if (this.adminPasscode) {
      return this.adminPasscode;
    }
  }
}