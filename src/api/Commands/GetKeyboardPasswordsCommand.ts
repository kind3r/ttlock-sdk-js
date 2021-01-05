'use strict';

import { CommandType } from "../../constant/CommandType";
import { KeyboardPwdType } from "../../constant/KeyboardPwdType";
import { Command } from "../Command";

export interface KeyboardPassCode {
  type: KeyboardPwdType;
  newPassCode: string;
  passCode: string;
  startDate?: string;
  endDate?: string;
}

export class GetKeyboardPasswordsCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_PWD_LIST;

  private sequence?: number;
  private passCodes?: KeyboardPassCode[];

  protected processData(): void {
    if (this.commandData && this.commandData.length >= 2) {
      const totalLen = this.commandData.readUInt16BE(0);
      this.passCodes = [];
      if (totalLen > 0) {
        this.sequence = this.commandData.readInt16BE(2);
        let index = 4;
        while (index < this.commandData.length) {
          // const len = this.commandData.readUInt8(index++);
          index++;
          let passCode: KeyboardPassCode = {
            type: this.commandData.readUInt8(index++),
            newPassCode: "",
            passCode: ""
          };
  
          let codeLen = this.commandData.readUInt8(index++);
          passCode.newPassCode = this.commandData.subarray(index, index + codeLen).toString();
          index += codeLen;
  
          codeLen = this.commandData.readUInt8(index++);
          passCode.passCode = this.commandData.subarray(index, index + codeLen).toString();
          index += codeLen;
  
          passCode.startDate = "20" + this.commandData.readUInt8(index++).toString().padStart(2, '0') // year
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // month
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // day
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // hour
            + this.commandData.readUInt8(index++).toString().padStart(2, '0'); // minutes
  
          switch (passCode.type) {
            case KeyboardPwdType.PWD_TYPE_COUNT:
            case KeyboardPwdType.PWD_TYPE_PERIOD:
              passCode.endDate = "20" + this.commandData.readUInt8(index++).toString().padStart(2, '0') // year
                + this.commandData.readUInt8(index++).toString().padStart(2, '0') // month
                + this.commandData.readUInt8(index++).toString().padStart(2, '0') // day
                + this.commandData.readUInt8(index++).toString().padStart(2, '0') // hour
                + this.commandData.readUInt8(index++).toString().padStart(2, '0'); // minutes
              break;
            case KeyboardPwdType.PWD_TYPE_CIRCLE:
              index++;
              index++;
          }
          this.passCodes.push(passCode);
        }
      }
    }
  }

  build(): Buffer {
    if (typeof this.sequence != "undefined") {
      const data = Buffer.alloc(2);
      data.writeUInt16BE(this.sequence);
      return data;
    } else {
      return Buffer.from([]);
    }
  }

  setSequence(sequence: number = 0) {
    this.sequence = sequence;
  }

  getSequence(): number {
    if (this.sequence) {
      return this.sequence;
    } else {
      return -1;
    }
  }

  getPasscodes(): KeyboardPassCode[] {
    if (this.passCodes) {
      return this.passCodes;
    }
    return [];
  }
}