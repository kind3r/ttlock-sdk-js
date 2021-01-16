'use strict';

import { CommandResponse } from "../constant/CommandResponse";
import { CommandType } from "../constant/CommandType";

export interface CommandInterface {
  readonly COMMAND_TYPE: CommandType;
  new(data: Buffer): Command;
}

export abstract class Command {
  protected commandResponse: CommandResponse = CommandResponse.UNKNOWN;
  protected commandData?: Buffer;
  protected commandRawData?: Buffer;

  constructor(data?: Buffer) {
    if (data) {
      this.commandResponse = data.readInt8(1);
      this.commandData = data.subarray(2);
      if (process.env.TTLOCK_DEBUG_COMM == "1") {
        console.log('Command:', this.commandData.toString("hex"));
      }
      this.processData();
    }
  }

  getResponse(): CommandResponse {
    return this.commandResponse;
  }

  getRawData(): Buffer | void {
    return this.commandRawData;
  }

  protected abstract processData(): void;
  abstract build(): Buffer;
}