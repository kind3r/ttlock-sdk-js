'use strict';

import { CommandResponse } from "../../constant/CommandResponse";
import { CommandType } from "../../constant/CommandType";
import { Command } from "../Command";

export class AddAdminCommand extends Command {
  static COMMAND_TYPE: CommandType = CommandType.COMM_ADD_ADMIN;
  private adminPassword?: number;
  private unlockNumber?: number;

  generateNumber(): number {
    return Math.round(Math.random() * 1000000000);
  }

  setAdminPassword(adminPassword?: number): number {
    if (adminPassword) {
      this.adminPassword = adminPassword;
    } else {
      this.adminPassword = this.generateNumber();
    }
    return this.adminPassword;
  }

  getAdminPassword(): number | undefined {
    return this.adminPassword;
  }

  setUnlockNumber(unlockNumber?: number): number {
    if (unlockNumber) {
      this.unlockNumber = unlockNumber;
    } else {
      this.unlockNumber = this.generateNumber();
    }
    return this.unlockNumber;
  }

  getUnlockNumber(): number | undefined {
    return this.unlockNumber;
  }

  protected processData(): void {
    const data = this.commandData?.toString();
    if (data != "SCIENER") {
      this.commandResponse = CommandResponse.FAILED;
    }
  }

  build(): Buffer {

    throw new Error("Method not implemented.");
  }

}