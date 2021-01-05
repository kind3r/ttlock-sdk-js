'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class SearchBicycleStatusCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_SEARCH_BICYCLE_STATUS;

  private lockStatus?: number;

  protected processData(): void {
    if (this.commandData && this.commandData.length >= 2) {
      this.lockStatus = this.commandData.readInt8(1);
    }
  }

  build(): Buffer {
    return Buffer.from("SCIENER");
  }

  getLockStatus(): number {
    if (typeof this.lockStatus != "undefined") {
      return this.lockStatus;
    } else {
      return -1;
    }
  }

}