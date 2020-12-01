'use strict';

import { CommandEnvelope } from "../api/CommandEnvelope";
import {
  AddAdminCommand, AESKeyCommand, AudioManageCommand,
  InitPasswordsCommand, ScreenPasscodeManageCommand, SetAdminKeyboardPwdCommand,
  ControlRemoteUnlockCommand, DeviceFeaturesCommand, OperateFinishedCommand,
  ReadDeviceInfoCommand
} from "../api/Commands";
import { CodeSecret } from "../api/Commands/InitPasswordsCommand";
import { AudioManage } from "../constant/AudioManage";
import { CommandResponse } from "../constant/CommandResponse";
import { CommandType } from "../constant/CommandType";
import { ConfigRemoteUnlock } from "../constant/ConfigRemoteUnlock";
import { DeviceInfoEnum } from "../constant/DeviceInfoEnum";
import { FeatureValue } from "../constant/FeatureValue";
import { LockType } from "../constant/Lock";
import { defaultAESKey } from "../util/AESUtil";
import { stringifyBuffers } from "../util/jsonUtil";
import { AdminType } from "./AdminType";
import { DeviceInfoType } from "./DeviceInfoType";
import { PrivateDataType } from "./PrivateDataType";
import { TTBluetoothDevice } from "./TTBluetoothDevice";

export class TTLock {
  initialized: boolean = false;
  private device: TTBluetoothDevice;
  private featureList?: Set<FeatureValue>;
  private switchState?: any;
  private lockSound?: AudioManage.TURN_ON | AudioManage.TURN_OFF
  private displayPasscode?: 0 | 1;
  private autoLockTime?: number;
  private lightingTime?: number;
  private remoteUnlock?: ConfigRemoteUnlock.OP_OPEN | ConfigRemoteUnlock.OP_CLOSE;
  private deviceInfo?: DeviceInfoType;
  // sensitive data
  private privateData: PrivateDataType = {}

  constructor(device: TTBluetoothDevice) {
    this.device = device;
    this.initialized = !device.isSettingMode;
    this.device.on("dataReceived", this.onDataReceived.bind(this));
  }

  getId() {
    return this.device.id;
  }

  setAesKey(aesKey: Buffer) {
    this.privateData.aesKey = aesKey;
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
      console.log("========= AES key");
      const aesKey = await this.getAESKeyCommand();
      console.log("========= AES key:", aesKey.toString("hex"));

      // Add admin
      console.log("========= admin");
      const admin = await this.addAdminCommand(aesKey);
      console.log("========= admin:", admin);

      // Calibrate time
      console.log("========= time");
      await this.calibrateTimeCommand(aesKey);
      console.log("========= time");

      // Search device features
      console.log("========= feature list");
      const featureList = await this.searchDeviceFeatureCommand(aesKey);
      console.log("========= feature list", featureList);

      let switchState: any,
        lockSound: AudioManage.TURN_ON | AudioManage.TURN_OFF | undefined,
        displayPasscode: 0 | 1 | undefined,
        autoLockTime: number | undefined,
        lightingTime: number | undefined,
        adminPasscode: string | undefined,
        pwdInfo: CodeSecret[] | undefined,
        remoteUnlock: ConfigRemoteUnlock.OP_OPEN | ConfigRemoteUnlock.OP_CLOSE | undefined;

      // Feature depended queries
      if (featureList.has(FeatureValue.RESET_BUTTON)
        || featureList.has(FeatureValue.TAMPER_ALERT)
        || featureList.has(FeatureValue.PRIVACK_LOCK)) {
        console.log("========= switchState");
        switchState = await this.getSwitchStateCommand(undefined, aesKey);
        console.log("========= switchState:", switchState);
      }
      if (featureList.has(FeatureValue.AUDIO_MANAGEMENT)) {
        console.log("========= lockSound");
        lockSound = await this.audioManageCommand(undefined, aesKey);
        console.log("========= lockSound:", lockSound);
      }
      if (featureList.has(FeatureValue.PASSWORD_DISPLAY_OR_HIDE)) {
        console.log("========= displayPasscode");
        displayPasscode = await this.screenPasscodeManageCommand(undefined, aesKey);
        console.log("========= displayPasscode:", displayPasscode);
      }
      if (featureList.has(FeatureValue.AUTO_LOCK)) {
        console.log("========= autoLockTime");
        autoLockTime = await this.searchAutoLockTimeCommand(undefined, aesKey);
        console.log("========= autoLockTime:", autoLockTime);
      }
      if (featureList.has(FeatureValue.LAMP)) {
        console.log("========= lightingTime");
        lightingTime = await this.controlLampCommand(undefined, aesKey);
        console.log("========= lightingTime:", lightingTime);
      }
      if (featureList.has(FeatureValue.GET_ADMIN_CODE)) {
        // Command.COMM_GET_ADMIN_CODE
      } else if (this.device.lockType == LockType.LOCK_TYPE_V3_CAR) {
        // Command.COMM_GET_ALARM_ERRCORD_OR_OPERATION_FINISHED
      } else if (this.device.lockType == LockType.LOCK_TYPE_V3) {
        console.log("========= adminPasscode");
        adminPasscode = await this.setAdminKeyboardPwdCommand(undefined, aesKey);
        console.log("========= adminPasscode:", adminPasscode);
        console.log("========= pwdInfo");
        pwdInfo = await this.initPasswordsCommand(aesKey);
        console.log("========= pwdInfo:", pwdInfo);
      }

      if (featureList.has(FeatureValue.CONFIG_GATEWAY_UNLOCK)) {
        console.log("========= remoteUnlock");
        remoteUnlock = await this.controlRemoteUnlockCommand(ConfigRemoteUnlock.OP_CLOSE, aesKey);
        console.log("========= remoteUnlock:", remoteUnlock);
      }

      console.log("========= finished");
      await this.operateFinishedCommand(aesKey);
      console.log("========= finished");

      // save all the data we gathered during init sequence
      if (aesKey) this.privateData.aesKey = aesKey;
      if (admin) this.privateData.admin = admin;
      if (featureList) this.featureList = featureList;
      if (switchState) this.switchState = switchState;
      if (lockSound) this.lockSound = lockSound;
      if (displayPasscode) this.displayPasscode = displayPasscode;
      if (autoLockTime) this.autoLockTime = autoLockTime;
      if (lightingTime) this.lightingTime = lightingTime;
      if (adminPasscode) this.privateData.adminPasscode = adminPasscode;
      if (pwdInfo) this.privateData.pwdInfo = pwdInfo;
      if (remoteUnlock) this.remoteUnlock = remoteUnlock;

      // read device information
      console.log("========= device info");
      this.deviceInfo = await this.readAllDeviceInfo(aesKey);
      console.log("========= device info:", this.deviceInfo);

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
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(defaultAESKey);
      let cmd = responseEnvelope.getCommand();
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed getting AES key from lock");
      }
      if (cmd instanceof AESKeyCommand) {
        const command = cmd as AESKeyCommand;
        const aesKey = command.getAESKey();
        if (aesKey) {
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
  private async addAdminCommand(aesKey?: Buffer): Promise<AdminType> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_ADD_ADMIN);
    const addAdminCommand = requestEnvelope.getCommand() as AddAdminCommand;
    const admin: AdminType = {
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
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_TIME_CALIBRATE);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope, true, true);
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
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
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
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
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
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
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
        throw new Error("Failed to set screenPasscode mode");
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
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
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

  /**
   * Send InitPasswords command
   */
  private async initPasswordsCommand(aesKey?: Buffer): Promise<CodeSecret[]> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
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
          throw new Error("Failed to init passwords");
        }
        return pwdInfo;
      } else {
        throw new Error("Failed generating pwdInfo");
      }
    } else {
      throw new Error("No response to initPasswords");
    }
  }

  /**
   * Send ControlRemoteUnlock command to activate or disactivate remote unlock (via gateway?)
   */
  private async controlRemoteUnlockCommand(newValue?: ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN, aesKey?: Buffer): Promise<ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_CONTROL_REMOTE_UNLOCK);
    if (typeof newValue != "undefined") {
      const cmd = requestEnvelope.getCommand() as ControlRemoteUnlockCommand;
      cmd.setNewValue(newValue);
    }
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as ControlRemoteUnlockCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed to set remote unlock");
      }
      if (typeof newValue != "undefined") {
        return newValue;
      } else {
        const value = cmd.getValue();
        if (value) {
          return value;
        } else {
          throw new Error("Unable to get remote unlock value");
        }
      }
    } else {
      throw new Error("No response to get remote unlock");
    }
  }

  /**
   * Send OperateFinished command
   */
  private async operateFinishedCommand(aesKey?: Buffer): Promise<void> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_GET_ALARM_ERRCORD_OR_OPERATION_FINISHED);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as OperateFinishedCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed to set operateFinished");
      }
    } else {
      throw new Error("No response to operateFinished");
    }
  }

  private async readDeviceInfoCommand(infoType: DeviceInfoEnum, aesKey?: Buffer): Promise<Buffer> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_READ_DEVICE_INFO);
    let cmd = requestEnvelope.getCommand() as ReadDeviceInfoCommand;
    cmd.setInfoType(infoType);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ReadDeviceInfoCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed to set operateFinished");
      }
      const infoData = cmd.getInfoData();
      if (infoData) {
        return infoData;
      } else {
        return Buffer.from([]);
      }
    } else {
      throw new Error("No response to operateFinished");
    }
  }

  private async readAllDeviceInfo(aesKey?: Buffer): Promise<DeviceInfoType> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }

    const deviceInfo: DeviceInfoType = {
      featureValue: "",
      modelNum: "",
      hardwareRevision: "",
      firmwareRevision: "",
      nbNodeId: "",
      nbOperator: "",
      nbCardNumber: "",
      nbRssi: -1,
      factoryDate: "",
      lockClock: "",
    }

    deviceInfo.modelNum = (await this.readDeviceInfoCommand(DeviceInfoEnum.MODEL_NUMBER, aesKey)).toString();
    deviceInfo.hardwareRevision = (await this.readDeviceInfoCommand(DeviceInfoEnum.HARDWARE_REVISION, aesKey)).toString();
    deviceInfo.firmwareRevision = (await this.readDeviceInfoCommand(DeviceInfoEnum.FIRMWARE_REVISION, aesKey)).toString();
    deviceInfo.factoryDate = (await this.readDeviceInfoCommand(DeviceInfoEnum.MANUFACTURE_DATE, aesKey)).toString();
    if (this.featureList && this.featureList.has(FeatureValue.NB_LOCK)) {
      deviceInfo.nbOperator = (await this.readDeviceInfoCommand(DeviceInfoEnum.NB_OPERATOR, aesKey)).toString();
      deviceInfo.nbNodeId = (await this.readDeviceInfoCommand(DeviceInfoEnum.NB_IMEI, aesKey)).toString();
      deviceInfo.nbCardNumber = (await this.readDeviceInfoCommand(DeviceInfoEnum.NB_CARD_INFO, aesKey)).toString();
      deviceInfo.nbRssi = (await this.readDeviceInfoCommand(DeviceInfoEnum.NB_RSSI, aesKey)).readInt8(0);
    }

    return deviceInfo;
  }

  private onDataReceived(command: CommandEnvelope) {
    // is this just a notification (like the lock was locked/unlocked etc.)
    if (this.privateData.aesKey) {
      command.setAesKey(this.privateData.aesKey);
      console.log("Received:", command);
      const data = command.getCommand().getRawData();
      if (data) {
        console.log("Data", data.toString("hex"));
      }
    } else {
      console.error("Unable to decrypt notification, no AES key");
    }
  }


  toJSON(asObject: boolean = false): string | Object {
    let json: Object = this.device.toJSON(true);

    if (this.featureList) Reflect.set(json, 'featureList', this.featureList);
    if (this.switchState) Reflect.set(json, 'switchState', this.switchState);
    if (this.lockSound) Reflect.set(json, 'lockSound', this.lockSound);
    if (this.displayPasscode) Reflect.set(json, 'displayPasscode', this.displayPasscode);
    if (this.autoLockTime) Reflect.set(json, 'autoLockTime', this.autoLockTime);
    if (this.lightingTime) Reflect.set(json, 'lightingTime', this.lightingTime);
    if (this.remoteUnlock) Reflect.set(json, 'remoteUnlock', this.remoteUnlock);
    if (this.deviceInfo) Reflect.set(json, 'deviceInfo', this.deviceInfo);
    Reflect.set(json, 'privateData', this.privateData);

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(stringifyBuffers(json));
    }
  }
}