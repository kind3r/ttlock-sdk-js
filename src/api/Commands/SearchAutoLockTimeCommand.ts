'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class SearchAutoLockTimeCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_AUTO_LOCK_MANAGE;
  
  protected processData(): void {
    throw new Error("Method not implemented.");
  }
  build(): Buffer {
    throw new Error("Method not implemented.");
  }

}