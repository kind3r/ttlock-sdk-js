'use strict';

import { commandBuilder } from "../api/commandBuilder";
import { CommandEnvelope } from "../api/CommandEnvelope";
import { GetAESKeyCommand } from "../api/Commands";
import { CommandType } from "../constant/CommandType";
import { defaultAESKey } from "../util/AESUtil";
import { TTBluetoothDevice } from "./TTBluetoothDevice";

export class TTLock {
  initialized: boolean = false;
  private device: TTBluetoothDevice;
  private aesKey: Buffer = defaultAESKey;

  constructor(device: TTBluetoothDevice) {
    this.device = device;
    this.initialized = !device.isSettingMode;
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

    const getAesKeyCommand = CommandEnvelope.createFromLockType(this.device.lockType);
    getAesKeyCommand.setCommand(CommandType.COMM_GET_AES_KEY);
    getAesKeyCommand.setAesKey(this.aesKey);
    getAesKeyCommand.setData(Buffer.from("SCIENER"));
    console.log("Sent getAESKey command:", getAesKeyCommand, getAesKeyCommand.getData().toString());
    const getAesKeyResponse = await this.device.sendCommand(getAesKeyCommand);
    if (getAesKeyResponse) {
      getAesKeyResponse.setAesKey(this.aesKey);
      console.log("Received getAESKey response:", getAesKeyResponse);
      const command = commandBuilder(getAesKeyResponse.getData()) as GetAESKeyCommand;
      if (command instanceof GetAESKeyCommand) {
        console.log("Command is GetAESKeyCommand");
      }
      if (command.className == "GetAESKeyCommand") {
        const aesKey = command.getAESKey();
        if (aesKey) {
          this.aesKey = aesKey;
          // TODO: continue the initialisation flow
        } else {
          console.error("No AES key received");
        }
      } else {
        // bad response ...
        console.log("Gor response class", command.className, command);
        return false;
      }
    }

    return true;
  }

  isConnected(): boolean {
    return this.device.connected;
  }

  private onDataReceived(command: CommandEnvelope) {
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