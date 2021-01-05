'use strict';

import { CommandType } from "../../constant/CommandType";
import { PassageModeOperate } from "../../constant/PassageModeOperate";
import { PassageModeType } from "../../constant/PassageModeType";
import { Command } from "../Command";

export interface PassageModeData {
  type: PassageModeType;
  /** 1..7 (Monday..Sunday) */
  weekOrDay: number;
  /** month repeat */
  month: number;
  /** HHMM */
  startHour: string;
  /** HHMM */
  endHour: string;
}

export class PassageModeCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_CONFIGURE_PASSAGE_MODE;

  opType: PassageModeOperate = PassageModeOperate.QUERY;
  sequence?: number;
  dataOut?: PassageModeData[];
  dataIn?: PassageModeData;

  protected processData(): void {
    if (this.commandData && this.commandData.length > 0) {
      this.opType = this.commandData.readInt8(1);
      if (this.opType == PassageModeOperate.QUERY) {
        this.sequence = this.commandData.readInt8(2);
        this.dataOut = [];
        let index = 3;
        if (this.commandData.length >= 10) {
          {
            this.dataOut.push({
              type: this.commandData.readInt8(index),
              weekOrDay: this.commandData.readInt8(index + 1),
              month: this.commandData.readInt8(index + 2),
              startHour: this.commandData.readInt8(index + 3).toString().padStart(2, '0') + this.commandData.readInt8(index + 4).toString().padStart(2, '0'),
              endHour: this.commandData.readInt8(index + 5).toString().padStart(2, '0') + this.commandData.readInt8(index + 6).toString().padStart(2, '0'),
            });
            index += 7;
          } while (index < this.commandData.length);
        }
      } else {

      }
    }
  }

  build(): Buffer {
    if (this.opType == PassageModeOperate.QUERY) {
      return Buffer.from([this.opType, this.sequence]);
    } else if (this.dataIn) {
      return Buffer.from([
        this.opType,
        this.dataIn.type,
        this.dataIn.weekOrDay,
        this.dataIn.month,
        parseInt(this.dataIn.startHour.substr(0, 2)),
        parseInt(this.dataIn.startHour.substr(2, 2)),
        parseInt(this.dataIn.endHour.substr(0, 2)),
        parseInt(this.dataIn.endHour.substr(2, 2))
      ]);
    } else {
      return Buffer.from([this.opType]);
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

  setData(data: PassageModeData, type: PassageModeOperate.ADD | PassageModeOperate.DELETE = PassageModeOperate.ADD) {
    this.opType = type;
    this.dataIn = data;
  }

  setClear() {
    this.opType = PassageModeOperate.CLEAR;
  }

  getData(): PassageModeData[] {
    if (this.dataOut) {
      return this.dataOut;
    } else {
      return []
    }
  }
}