'use strict';

import { Command } from "../api/Command";
import { CommandType } from "../constant/CommandType";
import { defaultAESKey } from "../util/AESUtil";
import { TTBluetoothDevice } from "./TTBluetoothDevice";

export class TTLock {
  private device: TTBluetoothDevice;
  private aesKey: Buffer = Buffer.from([]);

  constructor(device: TTBluetoothDevice) {
    this.aesKey = defaultAESKey;
    this.device = device;
    this.device.on("dataReceived", this.onDataReceived.bind(this));
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

  async initLock(): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    if (!this.device.isSettingMode) {
      throw new Error("Lock is not in pairing mode");
    }

    // TODO: also check if lock is already inited (has AES key)

    const getAesKeyCommand = Command.createFromLockType(this.device.lockType);
    getAesKeyCommand.setCommand(CommandType.COMM_GET_AES_KEY);
    getAesKeyCommand.setAesKey(this.aesKey);
    getAesKeyCommand.setData(Buffer.from("SCIENER"));
    console.log("Sent getAESKey command:", getAesKeyCommand, getAesKeyCommand.getData().toString());
    const getAesKeyResponse = await this.device.sendCommand(getAesKeyCommand);
    if (getAesKeyResponse) {
      getAesKeyResponse.setAesKey(this.aesKey);
      console.log("Received getAESKey response:", getAesKeyResponse, getAesKeyResponse.getData().toString());

    }

    return true;
  }

  isConnected(): boolean {
    return this.device.connected;
  }

  private onDataReceived(command: Command) {
    // is this just a notification (like the lock was locked/unlocked etc.)
    command.setAesKey(this.aesKey);
    console.log("Received:", command);
    const data = command.getData();
    console.log("Data", data.toString("hex"));
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