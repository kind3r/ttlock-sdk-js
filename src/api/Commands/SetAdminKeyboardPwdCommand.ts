'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class SetAdminKeyboardPwdCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_SET_ADMIN_KEYBOARD_PWD;

  private adminPasscode?: string;

  protected processData(): void {
    throw new Error("Method not implemented.");
  }
  build(): Buffer {
    throw new Error("Method not implemented.");
  }

}