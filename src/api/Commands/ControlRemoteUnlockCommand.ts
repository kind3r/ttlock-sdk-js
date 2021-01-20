'use strict';

import { CommandType } from "../../constant/CommandType";
import { ConfigRemoteUnlock } from "../../constant/ConfigRemoteUnlock";
import { Command } from "../Command";

export class ControlRemoteUnlockCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_CONTROL_REMOTE_UNLOCK;

  private opType: ConfigRemoteUnlock.OP_TYPE_SEARCH | ConfigRemoteUnlock.OP_TYPE_MODIFY = ConfigRemoteUnlock.OP_TYPE_SEARCH;
  private opValue?: ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN;
  private batteryCapacity?: number;

  protected processData(): void {
    if (this.commandData && this.commandData.length > 0) {
      this.batteryCapacity = this.commandData.readUInt8(0);
      this.opType = this.commandData.readUInt8(1);
      if (this.opType == ConfigRemoteUnlock.OP_TYPE_SEARCH && this.commandData.length > 2) {
        this.opValue = this.commandData.readUInt8(2);
      }
    }
  }

  build(): Buffer {
    if (this.opType == ConfigRemoteUnlock.OP_TYPE_SEARCH) {
      return Buffer.from([this.opType]);
    } else if (this.opType == ConfigRemoteUnlock.OP_TYPE_MODIFY && typeof this.opValue != "undefined") {
      return Buffer.from([this.opType, this.opValue]);
    } else {
      return Buffer.from([]);
    }
  }

  setNewValue(opValue: ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN) {
    this.opValue = opValue;
    this.opType = ConfigRemoteUnlock.OP_TYPE_MODIFY;
  }

  getValue(): ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN | void {
    if (typeof this.opValue != "undefined") {
      return this.opValue;
    }
  }

  getBatteryCapacity(): number {
    if (typeof this.batteryCapacity != "undefined") {
      return this.batteryCapacity;
    } else {
      return -1;
    }
  }
}