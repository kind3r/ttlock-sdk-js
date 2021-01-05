'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class AESKeyCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_GET_AES_KEY;

  private aesKey?: Buffer;

  protected processData() {
    if (this.commandData) {
      this.setAESKey(this.commandData);
    }
  }

  build(): Buffer {
    if (this.aesKey) {
      return Buffer.concat([
        Buffer.from([AESKeyCommand.COMMAND_TYPE, this.commandResponse]),
        this.aesKey
      ]);
    } else {
      return Buffer.from("SCIENER");
    }
  }

  setAESKey(key: Buffer) {
    this.aesKey = key;
  }

  getAESKey(): Buffer | void {
    return this.aesKey;
  }
}