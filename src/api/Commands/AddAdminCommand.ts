'use strict';

import { CommandResponse } from "../../constant/CommandResponse";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class AddAdminCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_ADD_ADMIN;
  private adminPs?: number;
  private unlockKey?: number;

  generateNumber(): number {
    return Math.floor(Math.random() * 10000000000);
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
      const adminUnlock = new ArrayBuffer(8);
      const dataView = new DataView(adminUnlock);
      dataView.setUint32(0, this.adminPs, false); // Bin Endian
      dataView.setUint32(4, this.unlockKey, false); // Bin Endian
      return Buffer.concat([
        Buffer.from(adminUnlock),
        Buffer.from("SCIENER"),
      ]);
    } else {
      throw new Error("adminPs and unlockKey were not set");
    }
  }

}