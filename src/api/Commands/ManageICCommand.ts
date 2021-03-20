'use strict';

import { CommandType } from "../../constant/CommandType";
import { ICOperate } from "../../constant/ICOperate";
import { dateTimeToBuffer } from "../../util/timeUtil";
import { Command } from "../Command";

export interface ICCard {
  cardNumber: string;
  startDate: string;
  endDate: string;
}

export class ManageICCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_IC_MANAGE;

  private opType?: ICOperate;
  private sequence?: number;
  private cards?: ICCard[];
  private cardNumber?: string;
  private startDate?: string;
  private endDate?: string;
  private batteryCapacity?: number;

  protected processData(): void {
    if (this.commandData && this.commandData.length > 1) {
      this.batteryCapacity = this.commandData.readUInt8(0);
      this.opType = this.commandData.readUInt8(1);
      switch(this.opType) {
        case ICOperate.IC_SEARCH:
          this.cards = [];
          this.sequence = this.commandData.readInt16BE(2);
          let index = 4;
          while (index < this.commandData.length) {
            let card: ICCard = {
              cardNumber: "",
              startDate: "",
              endDate: ""
            };
            if (this.commandData.length == 24) {
              card.cardNumber = this.commandData.readBigUInt64BE(index).toString();
              index += 8;
            } else {
              card.cardNumber = this.commandData.readUInt32BE(index).toString();
              index += 4;
            }

            card.startDate = "20" + this.commandData.readUInt8(index++).toString().padStart(2, '0') // year
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // month
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // day
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // hour
            + this.commandData.readUInt8(index++).toString().padStart(2, '0'); // minutes

            card.endDate = "20" + this.commandData.readUInt8(index++).toString().padStart(2, '0') // year
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // month
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // day
            + this.commandData.readUInt8(index++).toString().padStart(2, '0') // hour
            + this.commandData.readUInt8(index++).toString().padStart(2, '0'); // minutes

            this.cards.push(card);
          }
          break;
        case ICOperate.ADD:
          let status = this.commandData.readUInt8(2);
          this.opType = status;
          switch (status) {
            case ICOperate.STATUS_ADD_SUCCESS:
              // TODO: APICommand.OP_RECOVERY_DATA
              let len = this.commandData.length - 3;
              // remaining length should be 4 or 8, but if the last 4 bytes are 0xff they should be ignored
              if (len == 4 || this.commandData.readUInt32BE(this.commandData.length - 5).toString(16) == 'ffffffff') {
                this.cardNumber = this.commandData.readUInt32BE(3).toString();
              } else {
                this.cardNumber = this.commandData.readBigUInt64BE(3).toString();
              }
              break;
            case ICOperate.STATUS_ENTER_ADD_MODE:
              // entered add mode
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
    if (this.opType) {
      switch (this.opType) {
        case ICOperate.IC_SEARCH:
          if (typeof this.sequence != "undefined") {
            let data = Buffer.alloc(3);
            data.writeUInt8(this.opType, 0);
            data.writeUInt16BE(this.sequence, 1);
            return data;
          }
          break;
        case ICOperate.ADD:
        case ICOperate.MODIFY:
          if (typeof this.cardNumber == "undefined") {
            return Buffer.from([this.opType]);
          } else {
            if (this.cardNumber && this.startDate && this.endDate) {
              let data: Buffer;
              let index = 0;
              if (this.cardNumber.length > 10) {
                data = Buffer.alloc(19);
                data.writeBigUInt64BE(BigInt(this.cardNumber), 1);
                index = 9;
              } else {
                data = Buffer.alloc(15);
                data.writeUInt32BE(parseInt(this.cardNumber), 1);
                index = 5;
              }
              data.writeUInt8(this.opType, 0);

              dateTimeToBuffer(this.startDate.substr(2) + this.endDate.substr(2)).copy(data, index);

              return data;
            }
          }
          break;
        case ICOperate.CLEAR:
          return Buffer.from([this.opType]);
        case ICOperate.DELETE:
          if (this.cardNumber) {
            if (this.cardNumber.length > 10) {
              const data = Buffer.alloc(9);
              data.writeUInt8(this.opType, 0);
              data.writeBigUInt64BE(BigInt(this.cardNumber), 1);
            } else {
              const data = Buffer.alloc(5);
              data.writeUInt8(this.opType, 0);
              data.writeUInt32BE(parseInt(this.cardNumber), 1);
              return data;
            }
          }
          break;
      }
    }
    return Buffer.from([]);
  }

  getType(): ICOperate {
    return this.opType || ICOperate.IC_SEARCH;
  }

  getCardNumber(): string {
    if (this.cardNumber) {
      return this.cardNumber;
    }
    else return "";
  }

  setSequence(sequence: number = 0) {
    this.sequence = sequence;
    this.opType = ICOperate.IC_SEARCH;
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

  setModify(cardNumber: string, startDate: string, endDate: string): void {
    this.cardNumber = cardNumber;
    this.startDate = startDate;
    this.endDate = endDate;
    this.opType = ICOperate.MODIFY;
  }

  setDelete(cardNumber: string): void {
    this.cardNumber = cardNumber;
    this.opType = ICOperate.DELETE;
  }

  setClear(): void {
    this.opType = ICOperate.CLEAR;
  }

  getCards(): ICCard[] {
    if (this.cards) {
      return this.cards;
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