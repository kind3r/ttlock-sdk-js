'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";
import moment from "moment";
import { dateTimeToBuffer } from "../../util/timeUtil";

export class CalibrationTimeCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_TIME_CALIBRATE;
  private time?: string;

  protected processData(): void {
    throw new Error("Method not implemented.");
  }

  build(): Buffer {
    if (typeof this.time == "undefined") {
      this.time = moment().format("YYMMDDHHmmss");
    }
    return dateTimeToBuffer(this.time);
  }

}