'use strict';

import { AudioManage } from "../../constant/AudioManage";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class AudioManageCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_AUDIO_MANAGE;
  private opType: AudioManage.QUERY | AudioManage.MODIFY = AudioManage.QUERY;
  private opValue?: AudioManage.TURN_ON | AudioManage.TURN_OFF; // lockData.lockSound
  
  protected processData(): void {
    if (this.commandData && this.commandData.length >= 3) {
      this.opType = this.commandData.readUInt8(1);
      if (this.opType == AudioManage.QUERY && this.commandData.length > 1) {
        this.opValue = this.commandData.readUInt8(1);
      }
    }
  }

  build(): Buffer {
    if (this.opType == AudioManage.QUERY) {
      return Buffer.from([this.opType]);
    } else {
      return Buffer.from([this.opType, this.opValue]);
    }
  }
  
  setNewValue(opValue: AudioManage.TURN_ON | AudioManage.TURN_OFF) {
    this.opValue = opValue;
    this.opType = AudioManage.MODIFY;
  }

  getValue(): AudioManage.TURN_ON | AudioManage.TURN_OFF | void {
    if (this.opValue) {
      return this.opValue;
    }
  }
}