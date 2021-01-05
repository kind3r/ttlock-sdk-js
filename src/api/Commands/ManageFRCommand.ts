'use strict';

import { CommandType } from "../../constant/CommandType";
import { ICOperate } from "../../constant/ICOperate";
import { dateTimeToBuffer } from "../../util/timeUtil";
import { Command } from "../Command";

export interface Fingerprint {
  fpNumber: string;
  startDate: string;
  endDate: string;
}

export class ManageFRCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_FR_MANAGE;

  private opType?: ICOperate;
  private sequence?: number;
  private fingerprints?: Fingerprint[];
  private fpNumber?: string;
  private startDate?: string;
  private endDate?: string;
  private batteryCapacity?: number;

  protected processData(): void {
    if (this.commandData && this.commandData.length > 1) {
      this.batteryCapacity = this.commandData.readUInt8(0);
      this.opType = this.commandData.readUInt8(1);
      switch(this.opType) {
        case ICOperate.FR_SEARCH:
          this.fingerprints = [];
          this.sequence = this.commandData.readInt16BE(2);
          let index = 4;
          while (index < this.commandData.length) {
            let fingerprint: Fingerprint = {
              fpNumber: "",
              startDate: "",
              endDate: ""
            };

            const fp: Buffer = Buffer.alloc(8);
            this.commandData.copy(fp, 2, index);
            fingerprint.fpNumber = fp.readBigInt64BE().toString();
            index += 6;

            fingerprint.startDate = "20" + this.commandData.readUInt8(index++).toString().padStart(2, '0') // year
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // month
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // day
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // hour
            + this.commandData.readUInt8(index++).toString().padStart(2, '0'); // minutes

            fingerprint.endDate = "20" + this.commandData.readUInt8(index++).toString().padStart(2, '0') // year
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // month
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // day
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // hour
            + this.commandData.readUInt8(index++).toString().padStart(2, '0'); // minutes

            this.fingerprints.push(fingerprint);
          }
          break;
        case ICOperate.ADD:
          let status = this.commandData.readUInt8(2);
          this.opType = status;
          switch (status) {
            case ICOperate.STATUS_ADD_SUCCESS:
              // TODO: APICommand.OP_RECOVERY_DATA
              const fp: Buffer = Buffer.alloc(8);
              this.commandData.copy(fp, 2, 3);
              this.fpNumber = fp.readBigInt64BE().toString();
              break;
            case ICOperate.STATUS_ENTER_ADD_MODE:
              // entered add mode
              break;
            case ICOperate.STATUS_FR_PROGRESS:
              // progress reading fingerprint
              break;
            case ICOperate.STATUS_FR_RECEIVE_TEMPLATE:
              // ready to receive fingerprint template
              break;
          }
          break;
        case ICOperate.MODIFY:
          break;
        case ICOperate.DELETE:
          break;
        case ICOperate.CLEAR:
          break;
      }
    }
  }

  build(): Buffer {
    if (typeof this.opType != "undefined") {
      switch (this.opType) {
        case ICOperate.FR_SEARCH:
          if (typeof this.sequence != "undefined") {
            const data = Buffer.alloc(3);
            data.writeUInt8(this.opType, 0);
            data.writeUInt16BE(this.sequence, 1);
            return data;
          }
          break;
        case ICOperate.ADD:
        case ICOperate.MODIFY:
          if (typeof this.fpNumber == "undefined") {
            return Buffer.from([this.opType]);
          } else {
            if (this.fpNumber && this.startDate && this.endDate) {
              const data: Buffer = Buffer.alloc(17);
              data.writeUInt8(this.opType, 0);

              const fp: Buffer = Buffer.alloc(8);
              fp.writeBigInt64BE(BigInt(this.fpNumber));
              fp.copy(data, 1, 2);

              dateTimeToBuffer(this.startDate.substr(2) + this.endDate.substr(2)).copy(data, 7);

              return data;
            }
          }
          break;
        case ICOperate.CLEAR:
          return Buffer.from([this.opType]);
        case ICOperate.DELETE:
          if (this.fpNumber) {
            const data = Buffer.alloc(7);
            data.writeUInt8(this.opType, 0);
            
            const fp: Buffer = Buffer.alloc(8);
            fp.writeBigInt64BE(BigInt(this.fpNumber));
            fp.copy(data, 1, 2);

            return data;
          }
          break;
      }
    }
    return Buffer.from([]);
  }

  getType(): ICOperate {
    return this.opType || ICOperate.IC_SEARCH;
  }

  getFpNumber(): string {
    if (this.fpNumber) {
      return this.fpNumber;
    }
    return "";
  }

  setSequence(sequence: number = 0) {
    this.sequence = sequence;
    this.opType = ICOperate.FR_SEARCH;
  }

  getSequence(): number {
    if (this.sequence) {
      return this.sequence;
    } else {
      return -1;
    }
  }

  setAdd(): void {
    this.opType = ICOperate.ADD;
  }

  setModify(fpNumber: string, startDate: string, endDate: string): void {
    this.fpNumber = fpNumber;
    this.startDate = startDate;
    this.endDate = endDate;
    this.opType = ICOperate.MODIFY;
  }

  setDelete(fpNumber: string): void {
    this.fpNumber = fpNumber;
    this.opType = ICOperate.DELETE;
  }

  setClear(): void {
    this.opType = ICOperate.CLEAR;
  }

  getFingerprints(): Fingerprint[] {
    if (this.fingerprints) {
      return this.fingerprints;
    }
    return [];
  }

  getBatteryCapacity(): number {
    if (this.batteryCapacity) {
      return this.batteryCapacity;
    } else {
      return -1;
    }
  }
}