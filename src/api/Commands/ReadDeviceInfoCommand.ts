'use strict';

import { CommandType } from "../../constant/CommandType";
import { DeviceInfoEnum } from "../../constant/DeviceInfoEnum";
import { Command } from "../Command";

export class ReadDeviceInfoCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_READ_DEVICE_INFO;
  private opType: DeviceInfoEnum = DeviceInfoEnum.MODEL_NUMBER;

  protected processData(): void {
    // nothing to do here
  }

  setInfoType(infoType: DeviceInfoEnum) {
    this.opType = infoType;
  }

  getInfoData(): Buffer | void {
    if (this.commandData) {
      return this.commandData.subarray(0, this.commandData.length - 1);
    }
  }

  build(): Buffer {
    return Buffer.from([this.opType]);
  }

}