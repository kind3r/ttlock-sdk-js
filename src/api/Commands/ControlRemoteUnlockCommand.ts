'use strict';

import { CommandType } from "../../constant/CommandType";
import { ConfigRemoteUnlock } from "../../constant/ConfigRemoteUnlock";
import { Command } from "../Command";

export class ControlRemoteUnlockCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_CONTROL_REMOTE_UNLOCK;
  
  private opType: ConfigRemoteUnlock.OP_TYPE_SEARCH | ConfigRemoteUnlock.OP_TYPE_MODIFY = ConfigRemoteUnlock.OP_TYPE_SEARCH;
  private opValue?: ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN;

  protected processData(): void {
    if (this.commandData) {
      this.opType = this.commandData.readUInt8(0);
      if (this.opType == ConfigRemoteUnlock.OP_TYPE_SEARCH && this.commandData.length > 1) {
        this.opValue = this.commandData.readUInt8(1);
      }
    }
  }

  build(): Buffer {
    if (this.opType == ConfigRemoteUnlock.OP_TYPE_SEARCH) {
      return Buffer.from([this.opType]);
    } else {
      return Buffer.from([this.opType, this.opValue]);
    }
  }

  setNewValue(opValue: ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN) {
    this.opValue = opValue;
    this.opType = ConfigRemoteUnlock.OP_TYPE_MODIFY;
  }

  getValue(): ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN | void {
    if (this.opValue) {
      return this.opValue;
    }
  }
}