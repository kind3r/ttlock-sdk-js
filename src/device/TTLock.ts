'use strict';

import { commandFromData } from "../api/commandBuilder";
import { CommandEnvelope } from "../api/CommandEnvelope";
import { AddAdmin, AESKeyCommand } from "../api/Commands";
import { CommandResponse } from "../constant/CommandResponse";
import { CommandType } from "../constant/CommandType";
import { defaultAESKey } from "../util/AESUtil";
import { TTBluetoothDevice } from "./TTBluetoothDevice";

export class TTLock {
  initialized: boolean = false;
  private device: TTBluetoothDevice;
  private aesKey: Buffer = defaultAESKey;
  private adminPassword?: number;
  private unlockNumber?: number;

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

    const getAesKeyEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, this.aesKey);
    getAesKeyEnvelope.setCommandType(CommandType.COMM_GET_AES_KEY);
    console.log("Sent getAESKey command:", getAesKeyEnvelope, getAesKeyEnvelope.buildCommandBuffer().toString("hex"));
    const getAesKeyResponseEnvelope = await this.device.sendCommand(getAesKeyEnvelope);
    if (getAesKeyResponseEnvelope) {
      getAesKeyResponseEnvelope.setAesKey(this.aesKey);
      console.log("Received getAESKey response:", getAesKeyResponseEnvelope);
      let cmd = getAesKeyResponseEnvelope.getCommand();
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed getting AES key from lock");
      }
      if (cmd instanceof AESKeyCommand) {
        const command = cmd as AESKeyCommand;
        const aesKey = command.getAESKey();
        if (aesKey) {
          this.aesKey = aesKey;
          console.log("Got AES key", aesKey.toString("hex"));
          const addAdminCommandEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, this.aesKey);
          addAdminCommandEnvelope.setCommandType(CommandType.COMM_ADD_ADMIN);
          const addAdminCommand = addAdminCommandEnvelope.getCommand() as AddAdmin;
          this.adminPassword = addAdminCommand.setAdminPassword();
          this.unlockNumber = addAdminCommand.setUnlockNumber();
          console.log("Setting adminPassword", this.adminPassword, "and unlockNumber", this.unlockNumber);
          return false; // disable sending this for the moment
          const addAdminResponseEnvelope = await this.device.sendCommand(addAdminCommandEnvelope);
          if (cmd.getResponse() != CommandResponse.SUCCESS) {
            throw new Error("Failed setting admin");
          }

        } else {
          console.error("No AES key received");
        }
      } else {
        // bad response ...
        console.log("Gor response class", cmd);
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
    const data = command.getCommand().getRawData();
    if (data) {
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