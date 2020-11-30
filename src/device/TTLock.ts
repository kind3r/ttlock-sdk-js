'use strict';

import { CommandEnvelope } from "../api/CommandEnvelope";
import { AddAdminCommand, AESKeyCommand, AudioManageCommand, InitPasswordsCommand, ScreenPasscodeManageCommand, SetAdminKeyboardPwdCommand } from "../api/Commands";
import { DeviceFeaturesCommand } from "../api/Commands/DeviceFeaturesCommand";
import { CodeSecret } from "../api/Commands/InitPasswordsCommand";
import { AudioManage } from "../constant/AudioManage";
import { CommandResponse } from "../constant/CommandResponse";
import { CommandType } from "../constant/CommandType";
import { FeatureValue } from "../constant/FeatureValue";
import { LockType } from "../constant/Lock";
import { defaultAESKey } from "../util/AESUtil";
import { TTBluetoothDevice } from "./TTBluetoothDevice";

export declare interface AdminInterface {
  adminPs: number;
  unlockKey: number;
}

export class TTLock {
  initialized: boolean = false;
  private device: TTBluetoothDevice;
  private featureList?: Set<FeatureValue>;
  private switchState?: any;
  private lockSound?: AudioManage.TURN_ON | AudioManage.TURN_OFF
  private displayPasscode?: 0 | 1;
  private autoLockTime?: number;
  private lightingTime?: number;

  // sensitive data
  private aesKey: Buffer = defaultAESKey;
  private admin?: AdminInterface;
  private unlockKey?: number;
  private adminPasscode?: string;
  private pwdInfo?: CodeSecret[];

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
      // const featureList = await this.searchDeviceFeatureCommand(aesKey);
      throw new Error("Init is paused at this stage for safety reasons");

      // Add admin
      const admin = await this.addAdminCommand(aesKey);

      // Calibrate time
      await this.calibrateTimeCommand(aesKey);

      // Search device features
      const featureList = await this.searchDeviceFeatureCommand(aesKey);

      let switchState: any,
        lockSound: AudioManage.TURN_ON | AudioManage.TURN_OFF | undefined,
        displayPasscode: 0 | 1 | undefined,
        autoLockTime: number | undefined,
        lightingTime: number | undefined,
        adminPasscode: string | undefined,
        pwdInfo: CodeSecret[] | undefined;

      // Feature depended queries
      if (featureList.has(FeatureValue.RESET_BUTTON)
        || featureList.has(FeatureValue.TAMPER_ALERT)
        || featureList.has(FeatureValue.PRIVACK_LOCK)) {
        switchState = await this.getSwitchStateCommand(undefined, aesKey);
      }
      if (featureList.has(FeatureValue.AUDIO_MANAGEMENT)) {
        lockSound = await this.audioManageCommand(undefined, aesKey);
      }
      if (featureList.has(FeatureValue.PASSWORD_DISPLAY_OR_HIDE)) {
        displayPasscode = await this.screenPasscodeManageCommand(undefined, aesKey);
      }
      if (featureList.has(FeatureValue.AUTO_LOCK)) {
        autoLockTime = await this.searchAutoLockTimeCommand(undefined, aesKey);
      }
      if (featureList.has(FeatureValue.LAMP)) {
        lightingTime = await this.controlLampCommand(undefined, aesKey);
      }
      if (featureList.has(FeatureValue.GET_ADMIN_CODE)) {
        // Command.COMM_GET_ADMIN_CODE
      } else if (this.device.lockType == LockType.LOCK_TYPE_V3_CAR) {
        // Command.COMM_GET_ALARM_ERRCORD_OR_OPERATION_FINISHED
      } else if (this.device.lockType == LockType.LOCK_TYPE_V3) {
        adminPasscode = await this.setAdminKeyboardPwdCommand(undefined, aesKey);
        pwdInfo = await this.initPasswordsCommand(aesKey);
      }



      // save all the data we gathered during init sequence
      if (aesKey) this.aesKey = aesKey;
      if (admin) this.admin = admin;
      if (featureList) this.featureList = featureList;
      if (switchState) this.switchState = switchState;
      if (lockSound) this.lockSound = lockSound;
      if (displayPasscode) this.displayPasscode = displayPasscode;
      if (autoLockTime) this.autoLockTime = autoLockTime;
      if (lightingTime) this.lightingTime = lightingTime;
      if (adminPasscode) this.adminPasscode = adminPasscode;
      if (pwdInfo) this.pwdInfo = pwdInfo;

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
      const cmd = responseEnvelope.getCommand() as DeviceFeaturesCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed to search device features");
      }
      return cmd.getFeaturesList();
    } else {
      throw new Error("No response to search device features");
    }
  }

  private async getSwitchStateCommand(newValue?: any, aesKey?: Buffer): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Send AudioManage command to get or set the audio feedback
   */
  private async audioManageCommand(newValue?: AudioManage.TURN_ON | AudioManage.TURN_OFF, aesKey?: Buffer): Promise<AudioManage.TURN_ON | AudioManage.TURN_OFF> {
    if (typeof aesKey == "undefined") {
      aesKey = this.aesKey;
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_AUDIO_MANAGE);
    if (typeof newValue != "undefined") {
      const cmd = requestEnvelope.getCommand() as AudioManageCommand;
      cmd.setNewValue(newValue);
    }
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as AudioManageCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed to set audio mode");
      }
      if (typeof newValue != "undefined") {
        return newValue;
      } else {
        const value = cmd.getValue();
        if (value) {
          return value;
        } else {
          throw new Error("Unable to get audioManage value");
        }
      }
    } else {
      throw new Error("No response to get audioManage");
    }
  }

  /**
   * Send ScreenPasscodeManage command to get or set password display
   */
  private async screenPasscodeManageCommand(newValue?: 0 | 1, aesKey?: Buffer): Promise<0 | 1> {
    if (typeof aesKey == "undefined") {
      aesKey = this.aesKey;
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_SHOW_PASSWORD);
    if (typeof newValue != "undefined") {
      const cmd = requestEnvelope.getCommand() as ScreenPasscodeManageCommand;
      cmd.setNewValue(newValue);
    }
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as ScreenPasscodeManageCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed to set audio mode");
      }
      if (typeof newValue != "undefined") {
        return newValue;
      } else {
        const value = cmd.getValue();
        if (value) {
          return value;
        } else {
          throw new Error("Unable to get screenPasscode value");
        }
      }
    } else {
      throw new Error("No response to get screenPasscode");
    }
  }

  private async searchAutoLockTimeCommand(newValue?: any, aesKey?: Buffer): Promise<number | undefined> {
    throw new Error("Method not implemented.");
  }

  private async controlLampCommand(newValue?: any, aesKey?: Buffer): Promise<number | undefined> {
    throw new Error("Method not implemented.");
  }

  /**
   * Send SetAdminKeyboardPwd
   */
  private async setAdminKeyboardPwdCommand(adminPasscode?: string, aesKey?: Buffer): Promise<string> {
    if (typeof aesKey == "undefined") {
      aesKey = this.aesKey;
    }
    if (typeof adminPasscode == "undefined") {
      adminPasscode = "";
      for (let i = 0; i < 7; i++) {
        adminPasscode += (Math.floor(Math.random() * 10)).toString();
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_SET_ADMIN_KEYBOARD_PWD);
    let cmd = requestEnvelope.getCommand() as SetAdminKeyboardPwdCommand;
    cmd.setAdminPasscode(adminPasscode);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as SetAdminKeyboardPwdCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed to set adminPasscode");
      }
      return adminPasscode;
    } else {
      throw new Error("No response to set adminPasscode");
    }
  }

  private async initPasswordsCommand(aesKey?: Buffer): Promise<CodeSecret[]> {
    if (typeof aesKey == "undefined") {
      aesKey = this.aesKey;
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_INIT_PASSWORDS);
    let cmd = requestEnvelope.getCommand() as InitPasswordsCommand;
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      const pwdInfo = cmd.getPwdInfo();
      if (pwdInfo) {
        responseEnvelope.setAesKey(aesKey);
        cmd = responseEnvelope.getCommand() as InitPasswordsCommand;
        if (cmd.getResponse() != CommandResponse.SUCCESS) {
          console.error(pwdInfo);
          throw new Error("Failed to set adminPasscode");
        }
        return pwdInfo;
      } else {
        throw new Error("Failed generating pwdInfo");
      }
    } else {
      throw new Error("No response to initPasswords");
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
    Reflect.set(json, 'aesKey', this.aesKey.toString("hex"));
    Reflect.set(json, 'aesKey', this.aesKey.toString("hex"));
    Reflect.set(json, 'aesKey', this.aesKey.toString("hex"));
    Reflect.set(json, 'aesKey', this.aesKey.toString("hex"));

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(json);
    }
  }
}