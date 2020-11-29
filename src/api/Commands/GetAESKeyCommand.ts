'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class GetAESKeyCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_GET_AES_KEY;
  className = this.constructor.name;

  private aesKey?: Buffer;

  processData() {
    if (this.commandData) {
      this.setAESKey(this.commandData);
    }
  }

  build(): Buffer {
    throw new Error("Method not implemented.");
  }

  setAESKey(key: Buffer) {
    this.aesKey = key;
  }

  getAESKey(): Buffer | void {
    return this.aesKey;
  }
}