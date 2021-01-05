'use strict';

import { Command } from "../Command";

export class UnknownCommand extends Command {
  
  protected processData(): void {
    if (this.commandData) {
      console.error("Unknown command type 0x" + this.commandData.readInt8().toString(16), "succes", this.commandResponse, "data", this.commandData.toString("hex"));
    }
  }
  
  build(): Buffer {
    throw new Error("Method not implemented.");
  }
}