'use strict';

import { AudioManage } from "../../constant/AudioManage";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class AudioManageCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_AUDIO_MANAGE;
  private opType: AudioManage.QUERY | AudioManage.MODIFY = AudioManage.QUERY;
  private opValue?: AudioManage.TURN_ON | AudioManage.TURN_OFF; // lockData.lockSound
  private batteryCapacity?: number;

  protected processData(): void {
    if (this.commandData && this.commandData.length >= 3) {
      this.batteryCapacity = this.commandData.readUInt8(0);
      this.opType = this.commandData.readUInt8(1);
      if (this.opType == AudioManage.QUERY) {
        this.opValue = this.commandData.readUInt8(2);
      }
    }
  }

  build(): Buffer {
    if (this.opType == AudioManage.QUERY) {
      return Buffer.from([this.opType]);
    } else if (this.opType == AudioManage.MODIFY && typeof this.opValue != "undefined") {
      return Buffer.from([this.opType, this.opValue]);
    } else {
      return Buffer.from([]);
    }
  }

  setNewValue(opValue: AudioManage.TURN_ON | AudioManage.TURN_OFF) {
    this.opValue = opValue;
    this.opType = AudioManage.MODIFY;
  }

  getValue(): AudioManage.TURN_ON | AudioManage.TURN_OFF | void {
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