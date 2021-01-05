'use strict';

import { CommandType } from "../../constant/CommandType";
import { CyclicOpType } from "../../constant/CyclicOpType";
import { Command } from "../Command";
import { CyclicConfig } from "../ValidityInfo";

export class CyclicDateCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_CYCLIC_CMD;

  private opType?: CyclicOpType;
  private userType?: CyclicOpType;
  private user?: string;
  private cyclicConfig?: CyclicConfig;

  protected processData(): void {
    throw new Error("Method not implemented.");
  }

  build(): Buffer {
    if (typeof this.opType != "undefined") {
      switch (this.opType) {
        case CyclicOpType.ADD:
        case CyclicOpType.CLEAR:
          if (typeof this.userType != "undefined" && typeof this.user != "undefined") {
            let userLen = this.calculateUserLen(this.userType, this.user);
            let data: Buffer;
            if (this.opType == CyclicOpType.ADD) {
              data = Buffer.alloc(3 + userLen + 11); // why so much, we only requre 7 extra bytes
            } else {
              data = Buffer.alloc(3 + userLen);
            }
            switch (userLen) {
              case 6:
                data.writeBigInt64BE(BigInt(this.user), 1);
                break;
              case 8:
                data.writeBigInt64BE(BigInt(this.user), 3);
                break;
              case 4:
                data.writeInt32BE(parseInt(this.user), 3);
                break;
            }
            data.writeUInt8(this.opType, 0);
            data.writeUInt8(this.userType, 1);
            data.writeUInt8(userLen, 2);
            if (this.opType == CyclicOpType.ADD && typeof this.cyclicConfig != "undefined") {
              let index = userLen + 3;
              data.writeUInt8(CyclicOpType.CYCLIC_TYPE_WEEK, index++);
              data.writeUInt8(this.cyclicConfig.weekDay, index++);
              data.writeUInt8(0, index++);
              data.writeUInt8(this.cyclicConfig.startTime / 60, index++);
              data.writeUInt8(this.cyclicConfig.startTime % 60, index++);
              data.writeUInt8(this.cyclicConfig.endTime / 60, index++);
              data.writeUInt8(this.cyclicConfig.endTime % 60, index++);
            }
            return data;
          }
          break;
        default:
          throw new Error("opType not implemented");
      }
    }
    return Buffer.from([]);
  }

  addIC(cardNumber: string, cyclicConfig: CyclicConfig) {
    this.opType = CyclicOpType.ADD;
    this.userType = CyclicOpType.USER_TYPE_IC;
    this.user = cardNumber;
    this.cyclicConfig = cyclicConfig;
  }

  clearIC(cardNumber: string) {
    this.opType = CyclicOpType.CLEAR;
    this.userType = CyclicOpType.USER_TYPE_IC;
    this.user = cardNumber;
  }

  addFR(fpNumber: string, cyclicConfig: CyclicConfig) {
    this.opType = CyclicOpType.ADD;
    this.userType = CyclicOpType.USER_TYPE_FR;
    this.user = fpNumber;
    this.cyclicConfig = cyclicConfig;
  }

  clearFR(fpNumber: string) {
    this.opType = CyclicOpType.CLEAR;
    this.userType = CyclicOpType.USER_TYPE_FR;
    this.user = fpNumber;
  }

  private calculateUserLen(userType: CyclicOpType, user: string): number {
    let userLen = 8;
    if (userType == CyclicOpType.USER_TYPE_FR) {
      userLen = 6;
    } else {
      if (BigInt(user) <= 0xffffffff) {
        userLen = 4;
      }
    }
    return userLen;
  }
}