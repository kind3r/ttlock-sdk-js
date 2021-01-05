'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class OperateFinishedCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_GET_ALARM_ERRCORD_OR_OPERATION_FINISHED;

  protected processData(): void {
    // nothing to do
  }

  build(): Buffer {
    return Buffer.from([]);
  }

}