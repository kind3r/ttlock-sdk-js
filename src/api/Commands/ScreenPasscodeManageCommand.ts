'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class ScreenPasscodeManageCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_SHOW_PASSWORD;
  
  protected processData(): void {
    throw new Error("Method not implemented.");
  }
  build(): Buffer {
    throw new Error("Method not implemented.");
  }
  
}