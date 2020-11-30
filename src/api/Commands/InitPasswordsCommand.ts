'use strict';

import moment from "moment";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export declare interface CodeSecret {
  code: number,
  secret: string
}

export class InitPasswordsCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_INIT_PASSWORDS;
  protected pwdInfo?: CodeSecret[];

  protected processData(): void {
    throw new Error("Method not implemented.");
  }

  build(): Buffer {
    this.pwdInfo = this.generateCodeSecret();
    let year = this.calculateYear();

    // first data byte is the year
    let buffers: Buffer[] = [
      Buffer.from([year % 100]), // last 2 digits of the year
    ];
    for (let i = 0; i < 10; i++, year++) {
      buffers.push(this.combineCodeSecret(this.pwdInfo[i].code, this.pwdInfo[i].secret));
    }

    return Buffer.concat(buffers);
  }

  getPwdInfo(): CodeSecret[] | void {
    if (this.pwdInfo) {
      return this.pwdInfo;
    }
  }

  private generateCodeSecret(): CodeSecret[] {
    let generated: CodeSecret[] = [];
    for (let i = 0; i < 10; i++) {
      let secret: string = "";
      for (let j = 0; j < 10; j++) {
        secret += Math.floor(Math.random() * 10).toString();
      }
      generated.push({
        code: Math.floor(Math.random() * 1071),
        secret: secret
      });
    }
    return generated;
  }

  private combineCodeSecret(code: number, secret: string): Buffer {
    const res = Buffer.alloc(6);
    res[0] = code >> 4; console.log(res[0]);
    res[1] = code << 4;
    const bigSec = BigInt(secret);
    const sec = Buffer.alloc(8);
    sec.writeBigInt64BE(bigSec);
    sec.copy(res, 2, 4);
    res[1] = res[1] | sec[3];
    return res;
  }

  private calculateYear(): number {
    if (moment().format("MMDD") == "0101") { // someone does not like 1st of Jan
      return parseInt(moment().subtract(1, "years").format("YYYY"));
    } else {
      return parseInt(moment().format("YYYY"));
    }
  }
}