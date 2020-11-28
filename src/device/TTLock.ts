'use strict';

import { Command } from "../api/Command";
import { defaultAESKey } from "../util/AESUtil";
import { TTBluetoothDevice } from "./TTBluetoothDevice";

export class TTLock {
  private device: TTBluetoothDevice;
  private aesKey: Buffer = Buffer.from([]);

  constructor(device: TTBluetoothDevice) {
    this.aesKey = defaultAESKey;
    this.device = device;
    this.device.on("response", this.onResponseReceived.bind(this));
  }

  getId() {
    return this.device.id;
  }

  setAesKey(aesKey: Buffer) {
    this.aesKey = aesKey;
  }

  async connect(): Promise<boolean> {
    return await this.device.connect();
  }

  async disconnect(): Promise<void> {
    return await this.device.disconnect();
  }

  isConnected(): boolean {
    return this.device.connected;
  }

  private onResponseReceived(command: Command) {
    // are we waiting for a response to something ?
    // is this just a notification (like the lock was locked/unlocked etc.)
    command.setAesKey(this.aesKey);
    console.log("Received:", command);
    const data = command.getData();
    if (data != false) {
      console.log("Data", data.toString("hex"));
    }
  }


  toJSON(asObject: boolean = false): string | Object {
    let json: Object = this.device.toJSON(true);
    Reflect.set(json, 'aesKey', this.aesKey.toString("hex"));

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(json);
    }
  }
}