'use strict';

import { CommandEnvelope } from "../api/CommandEnvelope";
import { AddAdminCommand, AESKeyCommand } from "../api/Commands";
import { DeviceFeaturesCommand } from "../api/Commands/DeviceFeaturesCommand";
import { CommandResponse } from "../constant/CommandResponse";
import { CommandType } from "../constant/CommandType";
import { FeatureValue } from "../constant/FeatureValue";
import { defaultAESKey } from "../util/AESUtil";
import { TTBluetoothDevice } from "./TTBluetoothDevice";

interface AdminInterface {
  adminPs: number;
  unlockKey: number;
}

export class TTLock {
  initialized: boolean = false;
  private device: TTBluetoothDevice;
  private aesKey: Buffer = defaultAESKey;
  private adminPs?: number;
  private unlockKey?: number;
  private featureList?: Set<FeatureValue>;

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
    
    try {
      // Get AES key
      const aesKey = await this.getAESKeyCommand();
      const featureList = await this.searchDeviceFeatureCommand(aesKey);
      throw new Error("Init is paused at this stage for safety reasons");
      // // Add admin
      // const admin = await this.addAdminCommand(aesKey);
      // // Calibrate time
      // await this.calibrateTimeCommand(aesKey);
      // // Search device features
      // const featureList = await this.searchDeviceFeatureCommand(aesKey);
      // // TODO: implement feature dependet extra queries

    } catch (error) {
      console.error("Error while initialising lock", error);
      return false;
    }

    return true;
  }

  isConnected(): boolean {
    return this.device.connected;
  }

  /**
   * Send AESKeyCommand
   */
  private async getAESKeyCommand(): Promise<Buffer> {
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, defaultAESKey);
    requestEnvelope.setCommandType(CommandType.COMM_GET_AES_KEY);
    console.log("Sent getAESKey command:", requestEnvelope, requestEnvelope.buildCommandBuffer().toString("hex"));
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(this.aesKey);
      console.log("Received getAESKey response:", responseEnvelope);
      let cmd = responseEnvelope.getCommand();
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed getting AES key from lock");
      }
      if (cmd instanceof AESKeyCommand) {
        const command = cmd as AESKeyCommand;
        const aesKey = command.getAESKey();
        if (aesKey) {
          // this.aesKey = aesKey;
          console.log("Got AES key", aesKey.toString("hex"));
          return aesKey;
        } else {
          throw new Error("Unable to getAESKey");
        }
      } else {
        throw new Error("Invalid response to getAESKey");
      }
    } else {
      throw new Error("No response to getAESKey");
    }
  }

  /**
   * Send AddAdmin command
   */
  private async addAdminCommand(aesKey?: Buffer): Promise<AdminInterface> {
    if (typeof aesKey == "undefined") {
      aesKey = this.aesKey;
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_ADD_ADMIN);
    const addAdminCommand = requestEnvelope.getCommand() as AddAdminCommand;
    const admin: AdminInterface = {
      adminPs: addAdminCommand.setAdminPs(),
      unlockKey: addAdminCommand.setUnlockKey(),
    }
    console.log("Setting adminPassword", admin.adminPs, "and unlockNumber", admin.unlockKey);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand();
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed AddAdmin");
      }
      return admin;
    } else {
      throw new Error("No response to AddAdmin");
    }
  }

  /**
   * Send CalibrationTime command
   */
  private async calibrateTimeCommand(aesKey?: Buffer): Promise<void> {
    if (typeof aesKey == "undefined") {
      aesKey = this.aesKey;
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_TIME_CALIBRATE);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand();
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed setting lock time");
      }
    } else {
      throw new Error("No response to time calibration");
    }
  }

  /**
   * Send SearchDeviceFeature command
   */
  private async searchDeviceFeatureCommand(aesKey?: Buffer): Promise<Set<FeatureValue>> {
    if (typeof aesKey == "undefined") {
      aesKey = this.aesKey;
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_SEARCHE_DEVICE_FEATURE);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand();
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed to search device features");
      }
      const command = cmd as DeviceFeaturesCommand;
      return command.getFeaturesList();
    } else {
      throw new Error("No response to search device features");
    }
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