'use strict';

import { NobleScanner } from "./NobleScanner";
import { NobleWebsocketBinding } from "./NobleWebsocketBinding";
const Noble = require("@abandonware/noble/with-bindings");

export class NobleScannerWebsocket extends NobleScanner {
  private websocketAddress: string;
  private websocketPort: number;
  private aesKey: string;
  private username: string;
  private password: string;

  constructor(uuids?: string[], address?: string, port?: number, aesKey?: string, username?: string, password?: string) {
    super(uuids || []);
    this.websocketAddress = address || "127.0.0.1";
    this.websocketPort = port || 80;
    this.aesKey = aesKey || "f8b55c272eb007f501560839be1f1e7e";
    this.username = username || "admin";
    this.password = password || "admin";
    this.createNobleWebsocket();
    this.initNoble();
  }

  protected createNoble() {

  }

  protected createNobleWebsocket() {
    const binding = new NobleWebsocketBinding(this.websocketAddress, this.websocketPort, this.aesKey, this.username, this.password);
    this.noble = new Noble(binding);
  }
}