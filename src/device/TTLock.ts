'use strict';

import { CommandEnvelope } from "../api/CommandEnvelope";
import { Fingerprint, ICCard, KeyboardPassCode, PassageModeData } from "../api/Commands";
import { CodeSecret } from "../api/Commands/InitPasswordsCommand";
import { AudioManage } from "../constant/AudioManage";
import { ConfigRemoteUnlock } from "../constant/ConfigRemoteUnlock";
import { FeatureValue } from "../constant/FeatureValue";
import { KeyboardPwdType } from "../constant/KeyboardPwdType";
import { LockType } from "../constant/Lock";
import { LockedStatus } from "../constant/LockedStatus";
import { PassageModeOperate } from "../constant/PassageModeOperate";
import { TTLockData, TTLockPrivateData } from "../store/TTLockData";
import { sleep } from "../util/timingUtil";
import { TTBluetoothDevice } from "./TTBluetoothDevice";
import { TTLockApi } from "./TTLockApi";

export interface TTLock {
  on(event: "lockUpdated", listener: (lock: TTLock) => void): this;
  on(event: "lockReset", listener: (address: string) => void): this;
  on(event: "connected", listener: (lock: TTLock) => void): this;
  on(event: "disconnected", listener: (lock: TTLock) => void): this;
  on(event: "locked", listener: (lock: TTLock) => void): this;
  on(event: "unlocked", listener: (lock: TTLock) => void): this;
  /** Emited when an IC Card is ready to be scanned */
  on(event: "scanICStart", listener: (lock: TTLock) => void): this;
  /** Emited when a fingerprint is ready to be scanned */
  on(event: "scanFRStart", listener: (lock: TTLock) => void): this;
  /** Emited after each fingerprint scan */
  on(event: "scanFRProgress", listener: (lock: TTLock) => void): this;
}

export class TTLock extends TTLockApi implements TTLock {
  private connected: boolean;
  private skipDataRead: boolean = false;
  private connecting: boolean = false;

  constructor(device: TTBluetoothDevice, data?: TTLockData) {
    super(device, data);
    this.connected = false;

    this.device.on("dataReceived", this.onDataReceived.bind(this));
    this.device.on("connected", this.onConnected.bind(this));
    this.device.on("disconnected", this.onDisconnected.bind(this));
  }

  getAddress(): string {
    return this.device.address;
  }

  getName(): string {
    return this.device.name;
  }

  getManufacturer(): string {
    return this.device.manufacturer;
  }

  getModel(): string {
    return this.device.model;
  }

  getFirmware(): string {
    return this.device.firmware;
  }

  getBattery(): number {
    return this.batteryCapacity;
  }

  getRssi(): number {
    return this.rssi;
  }

  async connect(skipDataRead: boolean = false, timeout: number = 15): Promise<boolean> {
    if (this.connecting) {
      console.log("Connect allready in progress");
      return false;
    }
    if (this.connected) {
      return true;
    }
    this.connecting = true;
    this.skipDataRead = skipDataRead;
    const connected = await this.device.connect();
    let timeoutCycles = timeout * 10;
    if (connected) {
      do {
        await sleep(100);
        timeoutCycles--;
      } while (!this.connected && timeoutCycles > 0 && this.connecting);
    }
    this.skipDataRead = false;
    this.connecting = false;
    // it is possible that even tho device initially connected, reading initial data will disconnect
    return this.connected;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    await this.device.disconnect();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isPaired(): boolean {
    const privateData = this.privateData;
    if (privateData.aesKey && privateData.admin && privateData.admin.adminPs && privateData.admin.unlockKey) {
      return true;
    } else {
      return false;
    }
  }

  hasPassCode(): boolean {
    if (typeof this.featureList != "undefined" && this.featureList.has(FeatureValue.PASSCODE)) {
      return true;
    }
    return false;
  }

  hasICCard(): boolean {
    if (typeof this.featureList != "undefined" && this.featureList.has(FeatureValue.IC)) {
      return true;
    }
    return false;
  }

  hasFingerprint(): boolean {
    if (typeof this.featureList != "undefined" && this.featureList.has(FeatureValue.FINGER_PRINT)) {
      return true;
    }
    return false;
  }

  hasAutolock(): boolean {
    if (typeof this.featureList != "undefined" && this.featureList.has(FeatureValue.AUTO_LOCK)) {
      return true;
    }
    return false;
  }

  /**
   * Initialize and pair with a new lock
   */
  async initLock(): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    if (this.initialized) {
      throw new Error("Lock is not in pairing mode");
    }

    // TODO: also check if lock is already inited (has AES key)

    try {
      // Init
      console.log("========= init");
      await this.initCommand();
      console.log("========= init");

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
      // if (featureList.has(FeatureValue.RESET_BUTTON)
      //   || featureList.has(FeatureValue.TAMPER_ALERT)
      //   || featureList.has(FeatureValue.PRIVACK_LOCK)) {
      //   console.log("========= switchState");
      //   switchState = await this.getSwitchStateCommand(undefined, aesKey);
      //   console.log("========= switchState:", switchState);
      // }
      if (featureList.has(FeatureValue.AUDIO_MANAGEMENT)) {
        console.log("========= lockSound");
        try {
          lockSound = await this.audioManageCommand(undefined, aesKey);
        } catch (error) {
          // this sometimes fails
          console.error(error);
        }
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
      // if (featureList.has(FeatureValue.LAMP)) {
      //   console.log("========= lightingTime");
      //   lightingTime = await this.controlLampCommand(undefined, aesKey);
      //   console.log("========= lightingTime:", lightingTime);
      // }
      if (featureList.has(FeatureValue.GET_ADMIN_CODE)) {
        // Command.COMM_GET_ADMIN_CODE
        console.log("========= getAdminCode");
        adminPasscode = await this.getAdminCodeCommand(aesKey);
        console.log("========= getAdminCode", adminPasscode);
        if (adminPasscode == "") {
          console.log("========= set adminPasscode");
          adminPasscode = await this.setAdminKeyboardPwdCommand(undefined, aesKey);
          console.log("========= set adminPasscode:", adminPasscode);
        }
      } else if (this.device.lockType == LockType.LOCK_TYPE_V3_CAR) {
        // Command.COMM_GET_ALARM_ERRCORD_OR_OPERATION_FINISHED
      } else if (this.device.lockType == LockType.LOCK_TYPE_V3) {
        console.log("========= set adminPasscode");
        adminPasscode = await this.setAdminKeyboardPwdCommand(undefined, aesKey);
        console.log("========= set adminPasscode:", adminPasscode);
      }

      console.log("========= init passwords");
      pwdInfo = await this.initPasswordsCommand(aesKey);
      console.log("========= init passwords:", pwdInfo);

      if (featureList.has(FeatureValue.CONFIG_GATEWAY_UNLOCK)) {
        console.log("========= remoteUnlock");
        remoteUnlock = await this.controlRemoteUnlockCommand(undefined, aesKey);
        console.log("========= remoteUnlock:", remoteUnlock);
      }

      console.log("========= finished");
      await this.operateFinishedCommand(aesKey);
      console.log("========= finished");

      // save all the data we gathered during init sequence
      if (aesKey) this.privateData.aesKey = Buffer.from(aesKey);
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
      this.lockedStatus = LockedStatus.LOCKED; // always locked by default

      // read device information
      console.log("========= device info");
      try {
        this.deviceInfo = await this.macro_readAllDeviceInfo(aesKey);
      } catch (error) {
        // this sometimes fails
        console.error(error);
      }
      console.log("========= device info:", this.deviceInfo);

    } catch (error) {
      console.error("Error while initialising lock", error);
      return false;
    }

    // TODO: we should now refresh the device's data (disconnect and reconnect maybe ?)
    this.initialized = true;
    this.emit("lockUpdated", this);
    return true;
  }

  /**
   * Lock the lock
   */
  async lock(): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    try {
      console.log("========= check user time");
      const psFromLock = await this.checkUserTime();
      console.log("========= check user time", psFromLock);
      console.log("========= lock");
      const lockData = await this.lockCommand(psFromLock);
      console.log("========= lock", lockData);
      this.lockedStatus = LockedStatus.LOCKED;
      this.emit("locked", this);
    } catch (error) {
      console.error("Error locking the lock", error);
      return false;
    }

    return true;
  }

  /**
   * Unlock the lock
   */
  async unlock(): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    try {
      console.log("========= check user time");
      const psFromLock = await this.checkUserTime();
      console.log("========= check user time", psFromLock);
      console.log("========= unlock");
      const unlockData = await this.unlockCommand(psFromLock);
      console.log("========= unlock", unlockData);
      this.lockedStatus = LockedStatus.UNLOCKED;
      this.emit("unlocked", this);
      // if autolock is on, then emit locked event after the timeout has passed
      if (this.autoLockTime > 0) {
        setTimeout(() => {
          this.lockedStatus = LockedStatus.LOCKED;
          this.emit("locked", this);
        }, this.autoLockTime * 1000);
      }
    } catch (error) {
      console.error("Error unlocking the lock", error);
      return false;
    }

    return true;
  }

  /**
   * Get the status of the lock (locked or unlocked)
   */
  async getLockStatus(noCache: boolean = false): Promise<LockedStatus> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    const oldStatus = this.lockedStatus;

    if (noCache || this.lockedStatus == LockedStatus.UNKNOWN) {
      if (!this.isConnected()) {
        throw new Error("Lock is not connected");
      }

      try {
        console.log("========= check lock status");
        this.lockedStatus = await this.searchBycicleStatusCommand();
        console.log("========= check lock status", this.lockedStatus);
      } catch (error) {
        console.error("Error getting lock status", error);
      }

    }

    if (oldStatus != this.lockedStatus) {
      if (this.lockedStatus == LockedStatus.LOCKED) {
        this.emit("locked", this);
      } else {
        this.emit("unlocked", this);
      }
    }

    return this.lockedStatus;
  }

  async getAutolockTime(noCache: boolean = false): Promise<number> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    const oldAutoLockTime = this.autoLockTime;

    if (noCache || this.autoLockTime == -1) {
      if (typeof this.featureList != "undefined") {
        if (this.featureList.has(FeatureValue.AUTO_LOCK)) {
          if (!this.isConnected()) {
            throw new Error("Lock is not connected");
          }

          try {
            if (await this.macro_adminLogin()) {
              console.log("========= autoLockTime");
              this.autoLockTime = await this.searchAutoLockTimeCommand();
              console.log("========= autoLockTime:", this.autoLockTime);
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
    }

    if (oldAutoLockTime != this.autoLockTime) {
      this.emit("lockUpdated", this);
    }

    return this.autoLockTime;
  }

  async setAutoLockTime(autoLockTime: number): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (this.autoLockTime != autoLockTime) {
      if (typeof this.featureList != "undefined") {
        if (this.featureList.has(FeatureValue.AUTO_LOCK)) {
          try {
            if (await this.macro_adminLogin()) {
              console.log("========= autoLockTime");
              await this.searchAutoLockTimeCommand(autoLockTime);
              console.log("========= autoLockTime");
              this.autoLockTime = autoLockTime;
              return true;
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
    }

    return false;
  }

  async resetLock(): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= reset");
        await this.resetLockCommand();
        console.log("========= reset");
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error while reseting the lock", error);
      return false;
    }

    // TODO: disconnect, cleanup etc.

    this.emit("lockReset", this.device.address);
    return true;
  }

  async getPassageMode(): Promise<PassageModeData[]> {
    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    let data: PassageModeData[] = [];

    try {
      if (await this.macro_adminLogin()) {
        let sequence = 0;
        do {
          console.log("========= get passage mode");
          const response = await this.getPassageModeCommand(sequence);
          console.log("========= get passage mode", response);
          sequence = response.sequence;
          response.data.forEach((passageData) => {
            data.push(passageData);
          });
        } while (sequence != -1);
      }
    } catch (error) {
      console.error("Error while getting passage mode", error);
    }

    return data;
  }

  async setPassageMode(data: PassageModeData): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= set passage mode");
        await this.setPassageModeCommand(data);
        console.log("========= set passage mode");
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error while getting passage mode", error);
      return false;
    }

    return true;
  }

  async deletePassageMode(data: PassageModeData): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= delete passage mode");
        await this.setPassageModeCommand(data, PassageModeOperate.DELETE);
        console.log("========= delete passage mode");
      }
    } catch (error) {
      console.error("Error while deleting passage mode", error);
      return false;
    }

    return true;
  }

  async clearPassageMode(): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= clear passage mode");
        await this.clearPassageModeCommand();
        console.log("========= clear passage mode");
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error while deleting passage mode", error);
      return false;
    }

    return true;
  }

  /**
   * Add a new passcode to unlock
   * @param type PassCode type: 1 - permanent, 2 - one time, 3 - limited time
   * @param passCode 4-9 digits code
   * @param startDate Valid from YYYYMMDDHHmm
   * @param endDate Valid to YYYYMMDDHHmm
   */
  async addPassCode(type: KeyboardPwdType, passCode: string, startDate?: string, endDate?: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasPassCode()) {
      throw new Error("No PassCode support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= add passCode");
        const result = await this.createCustomPasscodeCommand(type, passCode, startDate, endDate);
        console.log("========= add passCode", result);
        return result;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error while adding passcode", error);
      return false;
    }
  }

  /**
   * Update a passcode to unlock
   * @param type PassCode type: 1 - permanent, 2 - one time, 3 - limited time
   * @param oldPassCode 4-9 digits code - old code
   * @param newPassCode 4-9 digits code - new code
   * @param startDate Valid from YYYYMMDDHHmm
   * @param endDate Valid to YYYYMMDDHHmm
   */
  async updatePassCode(type: KeyboardPwdType, oldPassCode: string, newPassCode: string, startDate?: string, endDate?: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasPassCode()) {
      throw new Error("No PassCode support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= update passCode");
        const result = await this.updateCustomPasscodeCommand(type, oldPassCode, newPassCode, startDate, endDate);
        console.log("========= update passCode", result);
        return result;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error while updating passcode", error);
      return false;
    }
  }

  /**
   * Delete a set passcode
   * @param type PassCode type: 1 - permanent, 2 - one time, 3 - limited time
   * @param passCode 4-9 digits code
   */
  async deletePassCode(type: KeyboardPwdType, passCode: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasPassCode()) {
      throw new Error("No PassCode support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= delete passCode");
        const result = await this.deleteCustomPasscodeCommand(type, passCode);
        console.log("========= delete passCode", result);
        return result;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error while deleting passcode", error);
      return false;
    }
  }

  /**
   * Remove all stored passcodes
   */
  async clearPassCodes(): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasPassCode()) {
      throw new Error("No PassCode support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= clear passCodes");
        const result = await this.clearCustomPasscodesCommand();
        console.log("========= clear passCodes", result);
        return result;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error while clearing passcodes", error);
      return false;
    }
  }

  /**
   * Get all valid passcodes
   */
  async getPassCodes(): Promise<KeyboardPassCode[]> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasPassCode()) {
      throw new Error("No PassCode support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data: KeyboardPassCode[] = [];

    try {
      if (await this.macro_adminLogin()) {
        let sequence = 0;
        do {
          console.log("========= get passCodes", sequence);
          const response = await this.getCustomPasscodesCommand(sequence);
          console.log("========= get passCodes", response);
          sequence = response.sequence;
          response.data.forEach((passageData) => {
            data.push(passageData);
          });
        } while (sequence != -1);
      }
    } catch (error) {
      console.error("Error while getting passCodes", error);
    }

    return data;
  }

  /**
   * Add an IC Card
   * @param startDate Valid from YYYYMMDDHHmm
   * @param endDate Valid to YYYYMMDDHHmm
   * @returns serial number of the card that was added
   */
  async addICCard(startDate: string, endDate: string): Promise<string> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasICCard()) {
      throw new Error("No IC Card support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data = "";

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= add IC Card");
        const cardNumber = await this.addICCommand();
        console.log("========= updating IC Card", cardNumber);
        const response = await this.updateICCommand(cardNumber, startDate, endDate);
        console.log("========= updating IC Card", response);
        data = cardNumber;
      }
    } catch (error) {
      console.error("Error while adding IC Card", error);
    }

    return data;
  }

  /**
   * Update an IC Card
   * @param cardNumber Serial number of the card
   * @param startDate Valid from YYYYMMDDHHmm
   * @param endDate Valid to YYYYMMDDHHmm
   */
  async updateICCard(cardNumber: string, startDate: string, endDate: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasICCard()) {
      throw new Error("No IC Card support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data = false;

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= updating IC Card", cardNumber);
        const response = await this.updateICCommand(cardNumber, startDate, endDate);
        console.log("========= updating IC Card", response);
        data = response;
      }
    } catch (error) {
      console.error("Error while updating IC Card", error);
    }

    return data;
  }

  /**
   * Delete an IC Card
   * @param cardNumber Serial number of the card
   */
  async deleteICCard(cardNumber: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasICCard()) {
      throw new Error("No IC Card support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data = false;

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= updating IC Card", cardNumber);
        const response = await this.deleteICCommand(cardNumber);
        console.log("========= updating IC Card", response);
        data = response;
      }
    } catch (error) {
      console.error("Error while adding IC Card", error);
    }

    return data;
  }

  /**
   * Clear all IC Card data
   */
  async clearICCards(): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasICCard()) {
      throw new Error("No IC Card support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data = false;

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= clearing IC Cards");
        const response = await this.clearICCommand();
        console.log("========= clearing IC Cards", response);
        data = response;
      }
    } catch (error) {
      console.error("Error while clearing IC Cards", error);
    }

    return data;
  }

  /**
   * Get all valid IC cards and their validity interval
   */
  async getICCards(): Promise<ICCard[]> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasICCard()) {
      throw new Error("No IC Card support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data: ICCard[] = [];

    try {
      if (await this.macro_adminLogin()) {
        let sequence = 0;
        do {
          console.log("========= get IC Cards", sequence);
          const response = await this.getICCommand(sequence);
          console.log("========= get IC Cards", response);
          sequence = response.sequence;
          response.data.forEach((card) => {
            data.push(card);
          });
        } while (sequence != -1);
      }
    } catch (error) {
      console.error("Error while getting IC Cards", error);
    }

    return data;
  }

  /**
   * Add a Fingerprint
   * @param startDate Valid from YYYYMMDDHHmm
   * @param endDate Valid to YYYYMMDDHHmm
   * @returns serial number of the firngerprint that was added
   */
  async addFingerprint(startDate: string, endDate: string): Promise<string> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasFingerprint()) {
      throw new Error("No fingerprint support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data = "";

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= add Fingerprint");
        const fpNumber = await this.addFRCommand();
        console.log("========= updating Fingerprint", fpNumber);
        const response = await this.updateFRCommand(fpNumber, startDate, endDate);
        console.log("========= updating Fingerprint", response);
        data = fpNumber;
      }
    } catch (error) {
      console.error("Error while adding Fingerprint", error);
    }

    return data;
  }

  /**
   * Update a fingerprint
   * @param fpNumber Serial number of the fingerprint
   * @param startDate Valid from YYYYMMDDHHmm
   * @param endDate Valid to YYYYMMDDHHmm
   */
  async updateFingerprint(fpNumber: string, startDate: string, endDate: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasFingerprint()) {
      throw new Error("No fingerprint support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data = false;

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= updating Fingerprint", fpNumber);
        const response = await this.updateFRCommand(fpNumber, startDate, endDate);
        console.log("========= updating Fingerprint", response);
        data = response;
      }
    } catch (error) {
      console.error("Error while updating Fingerprint", error);
    }

    return data;
  }

  /**
   * Delete a fingerprint
   * @param fpNumber Serial number of the fingerprint
   */
  async deleteFingerprint(fpNumber: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasFingerprint()) {
      throw new Error("No fingerprint support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data = false;

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= updating Fingerprint", fpNumber);
        const response = await this.deleteFRCommand(fpNumber);
        console.log("========= updating Fingerprint", response);
        data = response;
      }
    } catch (error) {
      console.error("Error while adding Fingerprint", error);
    }

    return data;
  }

  /**
   * Clear all fingerprint data
   */
  async clearFingerprints(): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasFingerprint()) {
      throw new Error("No fingerprint support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data = false;

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= clearing Fingerprints");
        const response = await this.clearFRCommand();
        console.log("========= clearing Fingerprints", response);
        data = response;
      }
    } catch (error) {
      console.error("Error while clearing Fingerprints", error);
    }

    return data;
  }

  /**
   * Get all valid IC cards and their validity interval
   */
  async getFingerprints(): Promise<Fingerprint[]> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (!this.hasFingerprint()) {
      throw new Error("No fingerprint support");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    let data: Fingerprint[] = [];

    try {
      if (await this.macro_adminLogin()) {
        let sequence = 0;
        do {
          console.log("========= get Fingerprints", sequence);
          const response = await this.getFRCommand(sequence);
          console.log("========= get Fingerprints", response);
          sequence = response.sequence;
          response.data.forEach((fingerprint) => {
            data.push(fingerprint);
          });
        } while (sequence != -1);
      }
    } catch (error) {
      console.error("Error while getting Fingerprints", error);
    }

    return data;
  }

  /**
   * No ideea what this does ...
   * @param type 
   */
  async setRemoteUnlock(type?: ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN): Promise<ConfigRemoteUnlock.OP_CLOSE | ConfigRemoteUnlock.OP_OPEN | undefined> {
    if (!this.initialized) {
      throw new Error("Lock is in pairing mode");
    }

    if (typeof this.featureList == "undefined") {
      throw new Error("Lock features missing");
    }

    if (!this.featureList.has(FeatureValue.CONFIG_GATEWAY_UNLOCK)) {
      throw new Error("Lock does not support remote unlock");
    }

    if (!this.isConnected()) {
      throw new Error("Lock is not connected");
    }

    try {
      if (await this.macro_adminLogin()) {
        console.log("========= remoteUnlock");
        if (typeof type != "undefined") {
          this.remoteUnlock = await this.controlRemoteUnlockCommand(type);
        } else {
          this.remoteUnlock = await this.controlRemoteUnlockCommand();
        }
        console.log("========= remoteUnlock:", this.remoteUnlock);
      }
    } catch (error) {
      console.error("Error on remote unlock", error);
    }

    return this.remoteUnlock;
  }

  private onDataReceived(command: CommandEnvelope) {
    // is this just a notification (like the lock was locked/unlocked etc.)
    if (this.privateData.aesKey) {
      command.setAesKey(this.privateData.aesKey);
      const data = command.getCommand().getRawData();
      console.log("Received:", command);
      if (data) {
        console.log("Data", data.toString("hex"));
      }
    } else {
      console.error("Unable to decrypt notification, no AES key");
    }
  }

  private async onConnected(): Promise<void> {
    if (this.isPaired() && !this.skipDataRead) {
      // read general data
      console.log("Connected to known lock, reading general data");
      try {
        if (typeof this.featureList == "undefined") {
          // Search device features
          console.log("========= feature list");
          this.featureList = await this.searchDeviceFeatureCommand();
          console.log("========= feature list", this.featureList);
        }

        // Auto lock time
        if (this.featureList.has(FeatureValue.AUTO_LOCK) && this.autoLockTime == -1 && await this.macro_adminLogin()) {
          console.log("========= autoLockTime");
          this.autoLockTime = await this.searchAutoLockTimeCommand();
          console.log("========= autoLockTime:", this.autoLockTime);
        }

        if (this.lockedStatus == LockedStatus.UNKNOWN) {
          // Locked/unlocked status
          console.log("========= check lock status");
          this.lockedStatus = await this.searchBycicleStatusCommand();
          console.log("========= check lock status", this.lockedStatus);
        }
      } catch (error) {
        console.error("Failed reading general data from lock", error);
      }
    } else {
      if (this.device.isUnlock) {
        this.lockedStatus = LockedStatus.UNLOCKED;
      } else {
        this.lockedStatus = LockedStatus.LOCKED;
      }
    }

    // are we still connected ? It is possible the lock will disconnect while reading general data
    if (this.device.connected) {
      this.connected = true;
      this.emit("connected", this);
    }
  }

  private async onDisconnected(): Promise<void> {
    this.connected = false;
    this.connecting = false;
    this.emit("disconnected", this);
  }

  getLockData(): TTLockData | void {
    if (this.isPaired()) {
      const privateData: TTLockPrivateData = {
        aesKey: this.privateData.aesKey?.toString("hex"),
        admin: this.privateData.admin,
        adminPasscode: this.privateData.adminPasscode,
        pwdInfo: this.privateData.pwdInfo
      }
      const data: TTLockData = {
        address: this.device.address,
        battery: this.batteryCapacity,
        rssi: this.rssi,
        autoLockTime: this.autoLockTime ? this.autoLockTime : -1,
        lockedStatus: this.lockedStatus,
        privateData: privateData,
      };
      return data;
    }
  }

  /** Just for debugging */
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
    const privateData: Object = {};
    if (this.privateData.aesKey) Reflect.set(privateData, 'aesKey', this.privateData.aesKey.toString("hex"));
    if (this.privateData.admin) Reflect.set(privateData, 'admin', this.privateData.admin);
    if (this.privateData.adminPasscode) Reflect.set(privateData, 'adminPasscode', this.privateData.adminPasscode);
    if (this.privateData.pwdInfo) Reflect.set(privateData, 'pwdInfo', this.privateData.pwdInfo);
    Reflect.set(json, 'privateData', privateData);

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(json);
    }
  }
}