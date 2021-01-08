'use strict';

import { NobleScanner } from "./NobleScanner";
import { NobleWebsocketBinding } from "./NobleWebsocketBinding";
const Noble = require("@abandonware/noble/with-bindings");

export class NobleScannerWebsocket extends NobleScanner {
  private websocketAddress: string;
  private websocketPort: number;

  constructor(uuids: string[] = [], address: string = "127.0.0.1", port: number = 80) {
    super(uuids);
    this.websocketAddress = address;
    this.websocketPort = port;
    this.createNobleWebsocket();
    this.initNoble();
  }

  protected createNoble() {
    
  }

  protected createNobleWebsocket() {
    const binding = new NobleWebsocketBinding(this.websocketAddress, this.websocketPort);
    this.noble = new Noble(binding);
  }
}