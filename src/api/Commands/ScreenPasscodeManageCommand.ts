'use strict';

import { ActionType } from "../../constant/ActionType";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class ScreenPasscodeManageCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_SHOW_PASSWORD;

  private opType: ActionType.GET | ActionType.SET = ActionType.GET;
  private opValue?: 0 | 1; // lockData.displayPasscode
  
  protected processData(): void {
    if (this.commandData) {
      this.opType = this.commandData.readUInt8(0);
      if (this.opType == ActionType.GET && this.commandData.length > 1) {
        if (this.commandData.readUInt8(1) == 1) {
          this.opValue = 1;
        } else {
          this.opValue = 0;
        }
      }
    }
  }

  build(): Buffer {
    if (this.opType == ActionType.GET) {
      return Buffer.from([this.opType]);
    } else {
      return Buffer.from([this.opType, this.opValue]);
    }
  }
  
  setNewValue(opValue: 0 | 1) {
    this.opValue = opValue;
    this.opType = ActionType.SET;
  }

  getValue(): 0 | 1 | void {
    if (this.opValue) {
      return this.opValue;
    }
  }
}