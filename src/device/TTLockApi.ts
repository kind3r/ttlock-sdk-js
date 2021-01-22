'use strict';

import { EventEmitter } from "events";
import { CommandEnvelope, KeyboardPwdType, TTLockData } from "..";
import { AudioManage } from "../constant/AudioManage";
import { CommandResponse } from "../constant/CommandResponse";
import { CommandType } from "../constant/CommandType";
import { ConfigRemoteUnlock } from "../constant/ConfigRemoteUnlock";
import { FeatureValue } from "../constant/FeatureValue";
import { defaultAESKey } from "../util/AESUtil";
import { DeviceInfoType } from "./DeviceInfoType";
import { PrivateDataType } from "./PrivateDataType";
import { TTBluetoothDevice } from "./TTBluetoothDevice";
import {
  AddAdminCommand, AESKeyCommand, AudioManageCommand,
  InitPasswordsCommand, ScreenPasscodeManageCommand, SetAdminKeyboardPwdCommand,
  ControlRemoteUnlockCommand, DeviceFeaturesCommand, OperateFinishedCommand,
  ReadDeviceInfoCommand, AutoLockManageCommand, GetAdminCodeCommand,
  CheckAdminCommand, CheckRandomCommand, CheckUserTimeCommand,
  UnlockDataInterface, UnlockCommand, LockCommand,
  PassageModeCommand, PassageModeData, SearchBicycleStatusCommand,
  ManageKeyboardPasswordCommand, GetKeyboardPasswordsCommand, KeyboardPassCode,
  ICCard, ManageICCommand, ManageFRCommand, Fingerprint
} from "../api/Commands";
import { PassageModeOperate } from "../constant/PassageModeOperate";
import { AdminType } from "./AdminType";
import { CodeSecret } from "../api/Commands/InitPasswordsCommand";
import { DeviceInfoEnum } from "../constant/DeviceInfoEnum";
import { ICOperate } from "../constant/ICOperate";
import { LockedStatus } from "../constant/LockedStatus";

export interface PassageModeResponse {
  sequence: number;
  data: PassageModeData[];
}

export interface PassCodesResponse {
  sequence: number;
  data: KeyboardPassCode[];
}

export interface ICCardResponse {
  sequence: number;
  data: ICCard[];
}

export interface FingerprintResponse {
  sequence: number;
  data: Fingerprint[];
}

export abstract class TTLockApi extends EventEmitter {
  protected initialized: boolean;
  protected device: TTBluetoothDevice;

  // discoverable stuff
  protected featureList?: Set<FeatureValue>;
  protected switchState?: any;
  protected lockSound: AudioManage.TURN_ON | AudioManage.TURN_OFF | AudioManage.UNKNOWN;
  protected displayPasscode?: 0 | 1;
  protected autoLockTime: number;
  protected batteryCapacity: number;
  protected rssi: number;
  protected lightingTime?: number;
  protected remoteUnlock?: ConfigRemoteUnlock.OP_OPEN | ConfigRemoteUnlock.OP_CLOSE;
  protected lockedStatus: LockedStatus;
  protected deviceInfo?: DeviceInfoType;

  // sensitive data
  protected privateData: PrivateDataType;

  constructor(device: TTBluetoothDevice, data?: TTLockData) {
    super();
    this.device = device;
    this.privateData = {};
    if (this.device.isUnlock) {
      this.lockedStatus = LockedStatus.UNLOCKED;
    } else {
      this.lockedStatus = LockedStatus.LOCKED;
    }
    this.autoLockTime = -1;
    this.lockSound = AudioManage.UNKNOWN;
    this.batteryCapacity = this.device.batteryCapacity;
    this.rssi = this.device.rssi;
    this.initialized = false; // just workaround for TypeScript
    if (typeof data != "undefined") {
      this.updateLockData(data);
    } else {
      this.initialized = !this.device.isSettingMode;
    }
  }

  updateFromDevice() {
    this.batteryCapacity = this.device.batteryCapacity;
    this.rssi = this.device.rssi;
    this.initialized = !this.device.isSettingMode;
    if (this.device.isUnlock) {
      this.lockedStatus = LockedStatus.UNLOCKED;
    } else {
      this.lockedStatus = LockedStatus.LOCKED;
    }
  }

  updateLockData(data: TTLockData) {
    const privateData = data.privateData;
    if (privateData.aesKey) {
      this.privateData.aesKey = Buffer.from(privateData.aesKey, "hex");
    }
    this.privateData.admin = privateData.admin;
    this.privateData.adminPasscode = privateData.adminPasscode;
    this.privateData.pwdInfo = privateData.pwdInfo;
    this.initialized = true;
  }

  /**
   * Send init command
   */
  protected async initCommand(): Promise<void> {
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, defaultAESKey);
    requestEnvelope.setCommandType(CommandType.COMM_INITIALIZATION);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {

    } else {
      throw new Error("No response to init");
    }
  }

  /**
   * Send get AESKey command
   */
  protected async getAESKeyCommand(): Promise<Buffer> {
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
  protected async addAdminCommand(aesKey?: Buffer): Promise<AdminType> {
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
    console.log("Setting adminPs", admin.adminPs, "and unlockKey", admin.unlockKey);
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
  protected async calibrateTimeCommand(aesKey?: Buffer): Promise<void> {
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
  protected async searchDeviceFeatureCommand(aesKey?: Buffer): Promise<Set<FeatureValue>> {
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

  protected async getSwitchStateCommand(newValue?: any, aesKey?: Buffer): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Send AudioManage command to get or set the audio feedback
   */
  protected async audioManageCommand(newValue?: AudioManage.TURN_ON | AudioManage.TURN_OFF, aesKey?: Buffer): Promise<AudioManage.TURN_ON | AudioManage.TURN_OFF> {
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
      this.batteryCapacity = cmd.getBatteryCapacity();
      if (typeof newValue != "undefined") {
        return newValue;
      } else {
        const value = cmd.getValue();
        if (typeof value != "undefined") {
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
  protected async screenPasscodeManageCommand(newValue?: 0 | 1, aesKey?: Buffer): Promise<0 | 1> {
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

  protected async searchAutoLockTimeCommand(newValue?: any, aesKey?: Buffer): Promise<number> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_AUTO_LOCK_MANAGE);
    if (typeof newValue != "undefined") {
      const cmd = requestEnvelope.getCommand() as AutoLockManageCommand;
      cmd.setTime(newValue);
    }
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as AutoLockManageCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed to set/get autoLockTime");
      }
      return cmd.getTime();
    } else {
      throw new Error("No response to autoLockTime");
    }
  }

  protected async controlLampCommand(newValue?: any, aesKey?: Buffer): Promise<number | undefined> {
    throw new Error("Method not implemented.");
  }

  protected async getAdminCodeCommand(aesKey?: Buffer): Promise<string> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_GET_ADMIN_CODE);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as GetAdminCodeCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed to set adminPasscode");
      }
      const adminPasscode = cmd.getAdminPasscode();
      if (adminPasscode) {
        return adminPasscode;
      } else {
        return "";
      }
    } else {
      throw new Error("No response to get adminPasscode");
    }
  }

  /**
   * Send SetAdminKeyboardPwd
   */
  protected async setAdminKeyboardPwdCommand(adminPasscode?: string, aesKey?: Buffer): Promise<string> {
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
      console.log("Generated adminPasscode:", adminPasscode);
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
  protected async initPasswordsCommand(aesKey?: Buffer): Promise<CodeSecret[]> {
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
  protected async controlRemoteUnlockCommand(newValue?: ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN, aesKey?: Buffer): Promise<ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN> {
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
        this.batteryCapacity = cmd.getBatteryCapacity();
        const value = cmd.getValue();
        if (typeof value != "undefined") {
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
  protected async operateFinishedCommand(aesKey?: Buffer): Promise<void> {
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

  protected async readDeviceInfoCommand(infoType: DeviceInfoEnum, aesKey?: Buffer): Promise<Buffer> {
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
        console.error("Failed deviceInfo response");
        // throw new Error("Failed deviceInfo response");
      }
      const infoData = cmd.getInfoData();
      if (infoData) {
        return infoData;
      } else {
        return Buffer.from([]);
      }
    } else {
      throw new Error("No response to deviceInfo");
    }
  }

  protected async checkAdminCommand(aesKey?: Buffer): Promise<number> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    if (typeof this.privateData.admin == "undefined" || typeof this.privateData.admin.adminPs == "undefined") {
      throw new Error("Admin data is not set");
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_CHECK_ADMIN);
    let cmd = requestEnvelope.getCommand() as CheckAdminCommand;
    cmd.setParams(this.privateData.admin.adminPs);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as CheckAdminCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed checkAdmin response");
      }
      return cmd.getPsFromLock();
    } else {
      throw new Error("No response to checkAdmin");
    }
  }

  protected async checkRandomCommand(psFromLock: number, aesKey?: Buffer): Promise<void> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    if (typeof this.privateData.admin == "undefined" || typeof this.privateData.admin.unlockKey == "undefined") {
      throw new Error("Admin data is not set");
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_CHECK_RANDOM);
    let cmd = requestEnvelope.getCommand() as CheckRandomCommand;
    cmd.setSum(psFromLock, this.privateData.admin.unlockKey);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as CheckRandomCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed checkRandom response");
      }
    } else {
      throw new Error("No response to checkRandom");
    }
  }

  protected async resetLockCommand(aesKey?: Buffer): Promise<void> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_RESET_LOCK);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      // reset returns an empty response
    } else {
      throw new Error("No response to resetLock");
    }
  }

  protected async checkUserTime(startDate: string = '0001311400', endDate: string = "9911301400", aesKey?: Buffer): Promise<number> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_CHECK_USER_TIME);
    let cmd = requestEnvelope.getCommand() as CheckUserTimeCommand;
    cmd.setPayload(0, startDate, endDate, 0);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as CheckUserTimeCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed checkUserTime response");
      }
      return cmd.getPsFromLock();
    } else {
      throw new Error("No response to checkUserTime");
    }
  }

  protected async unlockCommand(psFromLock: number, aesKey?: Buffer): Promise<UnlockDataInterface> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    if (typeof this.privateData.admin == "undefined" || typeof this.privateData.admin.unlockKey == "undefined") {
      throw new Error("Admin data is not set");
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_UNLOCK);
    let cmd = requestEnvelope.getCommand() as UnlockCommand;
    cmd.setSum(psFromLock, this.privateData.admin.unlockKey);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as UnlockCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed unlock response");
      }
      // it is possible here that the UnlockCommand will have a bad CRC 
      // and we will read a SearchBicycleStatusCommand that is sent right after instead
      if (typeof cmd.getBatteryCapacity != "undefined") {
        this.batteryCapacity = cmd.getBatteryCapacity();
        return cmd.getUnlockData();
      } else {
        return {}
      }
    } else {
      throw new Error("No response to unlock");
    }
  }

  protected async lockCommand(psFromLock: number, aesKey?: Buffer): Promise<UnlockDataInterface> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    if (typeof this.privateData.admin == "undefined" || typeof this.privateData.admin.unlockKey == "undefined") {
      throw new Error("Admin data is not set");
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_FUNCTION_LOCK);
    let cmd = requestEnvelope.getCommand() as LockCommand;
    cmd.setSum(psFromLock, this.privateData.admin.unlockKey);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as LockCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed unlock response");
      }
      // it is possible here that the LockCommand will have a bad CRC 
      // and we will read a SearchBicycleStatusCommand  that is sent right after instead
      if (typeof cmd.getBatteryCapacity != "undefined") {
        this.batteryCapacity = cmd.getBatteryCapacity();
        return cmd.getUnlockData();
      } else {
        return {};
      }
    } else {
      throw new Error("No response to unlock");
    }
  }

  protected async getPassageModeCommand(sequence: number = 0, aesKey?: Buffer): Promise<PassageModeResponse> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_CONFIGURE_PASSAGE_MODE);
    let cmd = requestEnvelope.getCommand() as PassageModeCommand;
    cmd.setSequence(sequence);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as PassageModeCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed get passage mode response");
      }
      return {
        sequence: cmd.getSequence(),
        data: cmd.getData()
      }
    } else {
      throw new Error("No response to get passage mode");
    }
  }

  protected async setPassageModeCommand(data: PassageModeData, type: PassageModeOperate.ADD | PassageModeOperate.DELETE = PassageModeOperate.ADD, aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_CONFIGURE_PASSAGE_MODE);
    let cmd = requestEnvelope.getCommand() as PassageModeCommand;
    cmd.setData(data, type);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as PassageModeCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed set passage mode response");
      }
      return true;
    } else {
      throw new Error("No response to set passage mode");
    }
  }

  protected async clearPassageModeCommand(aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_CONFIGURE_PASSAGE_MODE);
    let cmd = requestEnvelope.getCommand() as PassageModeCommand;
    cmd.setClear();
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as PassageModeCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed clear passage mode response");
      }
      return true;
    } else {
      throw new Error("No response to clear passage mode");
    }
  }

  protected async searchBycicleStatusCommand(aesKey?: Buffer): Promise<number> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_SEARCH_BICYCLE_STATUS);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as SearchBicycleStatusCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed search status response");
      }
      return cmd.getLockStatus();
    } else {
      throw new Error("No response to search status");
    }
  }

  protected async createCustomPasscodeCommand(type: KeyboardPwdType, passCode: string, startDate?: string, endDate?: string, aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_MANAGE_KEYBOARD_PASSWORD);
    let cmd = requestEnvelope.getCommand() as ManageKeyboardPasswordCommand;
    cmd.addPasscode(type, passCode, startDate, endDate);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as ManageKeyboardPasswordCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed create passcode response");
      }
      return true;
    } else {
      throw new Error("No response to create passcode");
    }
  }

  protected async updateCustomPasscodeCommand(type: KeyboardPwdType, oldPassCode: string, newPassCode: string, startDate?: string, endDate?: string, aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_MANAGE_KEYBOARD_PASSWORD);
    let cmd = requestEnvelope.getCommand() as ManageKeyboardPasswordCommand;
    cmd.updatePasscode(type, oldPassCode, newPassCode, startDate, endDate);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as ManageKeyboardPasswordCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed update passcode response");
      }
      return true;
    } else {
      throw new Error("No response to update passcode");
    }
  }

  protected async deleteCustomPasscodeCommand(type: KeyboardPwdType, passCode: string, aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_MANAGE_KEYBOARD_PASSWORD);
    let cmd = requestEnvelope.getCommand() as ManageKeyboardPasswordCommand;
    cmd.deletePasscode(type, passCode);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as ManageKeyboardPasswordCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed delete passcode response");
      }
      return true;
    } else {
      throw new Error("No response to delete passcode");
    }
  }

  protected async clearCustomPasscodesCommand(aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_MANAGE_KEYBOARD_PASSWORD);
    let cmd = requestEnvelope.getCommand() as ManageKeyboardPasswordCommand;
    cmd.clearAllPasscodes();
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      const cmd = responseEnvelope.getCommand() as ManageKeyboardPasswordCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed clear passcodes response");
      }
      return true;
    } else {
      throw new Error("No response to clear passcodes");
    }
  }

  protected async getCustomPasscodesCommand(sequence: number = 0, aesKey?: Buffer): Promise<PassCodesResponse> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_PWD_LIST);
    let cmd = requestEnvelope.getCommand() as GetKeyboardPasswordsCommand;
    cmd.setSequence(sequence);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope, true, true);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as GetKeyboardPasswordsCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed get passCodes response");
      }
      return {
        sequence: cmd.getSequence(),
        data: cmd.getPasscodes()
      }
    } else {
      throw new Error("No response to get passCodes");
    }
  }

  protected async getICCommand(sequence: number = 0, aesKey?: Buffer): Promise<ICCardResponse> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_IC_MANAGE);
    let cmd = requestEnvelope.getCommand() as ManageICCommand;
    cmd.setSequence(sequence);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope, true, true);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ManageICCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed get IC response");
      }
      this.batteryCapacity = cmd.getBatteryCapacity();
      return {
        sequence: cmd.getSequence(),
        data: cmd.getCards()
      }
    } else {
      throw new Error("No response to get IC");
    }
  }

  protected async addICCommand(aesKey?: Buffer): Promise<string> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_IC_MANAGE);
    let cmd = requestEnvelope.getCommand() as ManageICCommand;
    cmd.setAdd();
    let responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ManageICCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS || cmd.getType() != ICOperate.STATUS_ENTER_ADD_MODE) {
        throw new Error("Failed add IC mode response");
      }
      this.emit("scanICStart", this);
      responseEnvelope = await this.device.waitForResponse();
      if (responseEnvelope) {
        responseEnvelope.setAesKey(aesKey);
        cmd = responseEnvelope.getCommand() as ManageICCommand;
        if (cmd.getResponse() != CommandResponse.SUCCESS || cmd.getType() != ICOperate.STATUS_ADD_SUCCESS) {
          throw new Error("Failed add IC response");
        }
        this.batteryCapacity = cmd.getBatteryCapacity();
        return cmd.getCardNumber();
      } else {
        throw new Error("No response to add IC");
      }
    } else {
      throw new Error("No response to add IC mode");
    }
  }

  protected async updateICCommand(cardNumber: string, startDate: string, endDate: string, aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_IC_MANAGE);
    let cmd = requestEnvelope.getCommand() as ManageICCommand;
    cmd.setModify(cardNumber, startDate, endDate);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ManageICCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed update IC");
      }
      this.batteryCapacity = cmd.getBatteryCapacity();
      return true;
    } else {
      throw new Error("No response to update IC");
    }
  }

  protected async deleteICCommand(cardNumber: string, aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_IC_MANAGE);
    let cmd = requestEnvelope.getCommand() as ManageICCommand;
    cmd.setDelete(cardNumber);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ManageICCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed delete IC");
      }
      this.batteryCapacity = cmd.getBatteryCapacity();
      return true;
    } else {
      throw new Error("No response to delete IC");
    }
  }

  protected async clearICCommand(aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_IC_MANAGE);
    let cmd = requestEnvelope.getCommand() as ManageICCommand;
    cmd.setClear();
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ManageICCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed clear IC");
      }
      this.batteryCapacity = cmd.getBatteryCapacity();
      return true;
    } else {
      throw new Error("No response to clear IC");
    }
  }

  protected async getFRCommand(sequence: number = 0, aesKey?: Buffer): Promise<FingerprintResponse> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_FR_MANAGE);
    let cmd = requestEnvelope.getCommand() as ManageFRCommand;
    cmd.setSequence(sequence);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope, true, true);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ManageFRCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed get FR response");
      }
      this.batteryCapacity = cmd.getBatteryCapacity();
      return {
        sequence: cmd.getSequence(),
        data: cmd.getFingerprints()
      }
    } else {
      throw new Error("No response to get FR");
    }
  }

  protected async addFRCommand(aesKey?: Buffer): Promise<string> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_FR_MANAGE);
    let cmd = requestEnvelope.getCommand() as ManageFRCommand;
    cmd.setAdd();
    let responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ManageFRCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS || cmd.getType() != ICOperate.STATUS_ENTER_ADD_MODE) {
        throw new Error("Failed add FR mode response");
      }
      this.emit("scanFRStart", this);

      // Fingerprint scanning progress
      do {
        responseEnvelope = await this.device.waitForResponse();
        if (responseEnvelope) {
          responseEnvelope.setAesKey(aesKey);
          cmd = responseEnvelope.getCommand() as ManageFRCommand;
          if (cmd.getType() == ICOperate.STATUS_FR_PROGRESS) {
            this.emit("scanFRProgress", this);
          }
        } else {
          throw new Error("No response to add FR progress");
        }
      } while (cmd.getResponse() == CommandResponse.SUCCESS && cmd.getType() == ICOperate.STATUS_FR_PROGRESS);

      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed during FR progress");
      }
      if (cmd.getType() != ICOperate.STATUS_ADD_SUCCESS) {
        throw new Error("Failed to add FR");
      }
      this.batteryCapacity = cmd.getBatteryCapacity();
      return cmd.getFpNumber();
    } else {
      throw new Error("No response to add FR mode");
    }
  }

  protected async updateFRCommand(fpNumber: string, startDate: string, endDate: string, aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_FR_MANAGE);
    let cmd = requestEnvelope.getCommand() as ManageFRCommand;
    cmd.setModify(fpNumber, startDate, endDate);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ManageFRCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed update FR");
      }
      this.batteryCapacity = cmd.getBatteryCapacity();
      return true;
    } else {
      throw new Error("No response to update FR");
    }
  }

  protected async deleteFRCommand(fpNumber: string, aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_FR_MANAGE);
    let cmd = requestEnvelope.getCommand() as ManageFRCommand;
    cmd.setDelete(fpNumber);
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ManageFRCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed delete FR");
      }
      this.batteryCapacity = cmd.getBatteryCapacity();
      return true;
    } else {
      throw new Error("No response to delete FR");
    }
  }

  protected async clearFRCommand(aesKey?: Buffer): Promise<boolean> {
    if (typeof aesKey == "undefined") {
      if (this.privateData.aesKey) {
        aesKey = this.privateData.aesKey;
      } else {
        throw new Error("No AES key for lock");
      }
    }
    const requestEnvelope = CommandEnvelope.createFromLockType(this.device.lockType, aesKey);
    requestEnvelope.setCommandType(CommandType.COMM_FR_MANAGE);
    let cmd = requestEnvelope.getCommand() as ManageFRCommand;
    cmd.setClear();
    const responseEnvelope = await this.device.sendCommand(requestEnvelope);
    if (responseEnvelope) {
      responseEnvelope.setAesKey(aesKey);
      cmd = responseEnvelope.getCommand() as ManageFRCommand;
      if (cmd.getResponse() != CommandResponse.SUCCESS) {
        throw new Error("Failed clear FR");
      }
      this.batteryCapacity = cmd.getBatteryCapacity();
      return true;
    } else {
      throw new Error("No response to clear FR");
    }
  }

  protected async macro_readAllDeviceInfo(aesKey?: Buffer): Promise<DeviceInfoType> {
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

  protected async macro_adminLogin(): Promise<boolean> {
    try {
      console.log("========= check admin");
      const psFromLock = await this.checkAdminCommand();
      console.log("========= check admin:", psFromLock);
      if (psFromLock > 0) {
        console.log("========= check random");
        await this.checkRandomCommand(psFromLock);
        console.log("========= check random");
        return true;
      } else {
        console.error("Invalid psFromLock received", psFromLock);
      }
    } catch (error) {
      console.error("macro_adminLogin:", error);
    }
    return false;
  }
}