'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class ResetLockCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_RESET_LOCK;

  protected processData(): void {
    // nothing to do here
  }

  build(): Buffer {
    return Buffer.from([]);
  }
}