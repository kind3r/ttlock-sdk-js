'use strict';

import { CommandResponse } from "../../constant/CommandResponse";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class AddAdminCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_ADD_ADMIN;
  private adminPs?: number;
  private unlockKey?: number;

  generateNumber(): number {
    return Math.floor(Math.random() * 100000000);
  }

  setAdminPs(adminPassword?: number): number {
    if (adminPassword) {
      this.adminPs = adminPassword;
    } else {
      this.adminPs = this.generateNumber();
    }
    return this.adminPs;
  }

  getAdminPs(): number | undefined {
    return this.adminPs;
  }

  setUnlockKey(unlockNumber?: number): number {
    if (unlockNumber) {
      this.unlockKey = unlockNumber;
    } else {
      this.unlockKey = this.generateNumber();
    }
    return this.unlockKey;
  }

  getUnlockKey(): number | undefined {
    return this.unlockKey;
  }

  protected processData(): void {
    const data = this.commandData?.toString();
    if (data != "SCIENER") {
      this.commandResponse = CommandResponse.FAILED;
    }
  }

  build(): Buffer {
    if (this.adminPs && this.unlockKey) {
      const adminUnlock = Buffer.alloc(8);//new ArrayBuffer(8);
      adminUnlock.writeInt32BE(this.adminPs, 0);
      adminUnlock.writeInt32BE(this.unlockKey, 4);
      return Buffer.concat([
        adminUnlock,
        Buffer.from("SCIENER"),
      ]);
    } else {
      throw new Error("adminPs and unlockKey were not set");
    }
  }

}