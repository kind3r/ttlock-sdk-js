'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class InitCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_INITIALIZATION;

  protected processData(): void {
    // nothing to do
  }

  build(): Buffer {
    return Buffer.from([]);
  }

}