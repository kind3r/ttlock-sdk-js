'use strict';

import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class CheckRandomCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_CHECK_RANDOM;

  private sum?: number;

  protected processData(): void {
    // nothing to do here
  }

  build(): Buffer {
    if (this.sum) {
      const data = Buffer.alloc(4);
      data.writeUInt32BE(this.sum);
      return data;
    }
    return Buffer.from([]);
  }

  setSum(psFromLock:number, unlockKey: number) {
    this.sum = psFromLock + unlockKey;
  }
}