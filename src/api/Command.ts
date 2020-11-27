'use strict';

import { CommandType } from "../constant/CommandType";
import { CodecUtils } from "../util/CodecUtils";
import { LockType, LockVersion } from "../constant/Lock";
import { AESUtil } from "../util/AESUtil";

export class Command {
  static defaultHeader: Buffer = Buffer.from([0x7F, 0x5A]);
  static APP_COMMAND: number = 0xaa;
  private header: Buffer | null = null;
  private protocol_type: number = -1;
  private sub_version: number = -1;
  private scene: number = -1;
  private organization: number = -1;
  private sub_organization: number = -1;
  private command: CommandType = -1;
  private encrypt: number = 0;
  private data: Buffer | null = null;
  private lockType: LockType = LockType.UNKNOWN;

  /**
   * Create a command from raw data usually received from characteristic change
   * @param rawData 
   */
  static createFromRawData(rawData: Buffer): Command {
    const command = new Command();
    if (rawData.length < 7) {
      throw new Error("Data too short");
    }
    command.header = rawData.subarray(0, 1);
    command.protocol_type = rawData.readInt8(2);
    if (command.protocol_type >= 5) { //New agreement 
      if (rawData.length < 13) {
        throw new Error("New agreement data too short");
      }
      command.sub_version = rawData.readInt8(3);
      command.scene = rawData.readInt8(4);
      command.organization = rawData.readInt16BE(5); // or readInt16LE ?
      command.sub_organization = rawData.readInt16BE(7);
      command.command = rawData.readUInt8(9);
      command.encrypt = rawData.readInt8(10);
      const length = rawData.readInt8(11);
      if (length < 0 || rawData.length < 12 + length + 1) { // header + data + crc 
        throw new Error("Invalid data length");
      }
      command.data = rawData.subarray(12, 12 + length);
    } else {
      command.command = rawData.readUInt8(3);
      command.encrypt = rawData.readInt8(4);
      const length = rawData.readInt8(5);
      if (length < 0 || rawData.length < 6 + length + 1) {
        throw new Error("Invalid data length");
      }
      command.data = rawData.subarray(6, 6 + length);
    }
    // const crc = CodecUtils.crccompute(rawData.slice(0, rawData.length - 1));
    // console.log(rawData.readUInt8(rawData.length - 1), crc);
    // check CRC
    if (rawData.readUInt8(rawData.length - 1) != CodecUtils.crccompute(rawData.slice(0, rawData.length - 1))) {
      throw new Error("CRC error");
    }
    command.generateLockType();

    return command;
  }

  /**
   * Create new command starting from the version of the device
   * @param lockVersion 
   */
  static createFromLockVersion(lockVersion: LockVersion): Command {
    const command = new Command;
    command.header = Command.defaultHeader;
    command.protocol_type = lockVersion.getProtocolType();
    command.sub_version = lockVersion.getProtocolVersion();
    command.scene = lockVersion.getScene();
    command.organization = lockVersion.getGroupId();
    command.sub_organization = lockVersion.getOrgId();
    command.encrypt = Command.APP_COMMAND;
    command.generateLockType();
    return command;
  }

  static createFromLockType(lockType: LockType): Command {
    const lockVersion = LockVersion.getLockVersion(lockType);
    if (lockVersion != null) {
      const command = Command.createFromLockVersion(lockVersion);
      if (lockType == LockType.LOCK_TYPE_V2) {
        command.encrypt = Math.round(Math.random() * 126) + 1;
      }
      command.generateLockType();
      return command;
    }
    throw new Error("Invalid lockType");
  }

  private constructor() {

  }

  /**
   * Maybe combine with ExtendedBluetoothDevice::getLockType
   */
  private generateLockType(): void {
    if (this.protocol_type == 0x05 && this.sub_version == 0x03 && this.scene == 0x07)
      this.setLockType(LockType.LOCK_TYPE_V3_CAR);
    else if (this.protocol_type == 0x0a && this.sub_version == 0x01)
      this.setLockType(LockType.LOCK_TYPE_CAR);
    else if (this.protocol_type == 0x05 && this.sub_version == 0x03)
      this.setLockType(LockType.LOCK_TYPE_V3);
    else if (this.protocol_type == 0x05 && this.sub_version == 0x04)
      this.setLockType(LockType.LOCK_TYPE_V2S_PLUS);
    else if (this.protocol_type == 0x05 && this.sub_version == 0x01)
      this.setLockType(LockType.LOCK_TYPE_V2S);
    else if (this.protocol_type == 0x0b && this.sub_version == 0x01)
      this.setLockType(LockType.LOCK_TYPE_MOBI);
    else if (this.protocol_type == 0x03)
      this.setLockType(LockType.LOCK_TYPE_V2);
  }

  setLockType(lockType: LockType) {
    this.lockType = lockType;
  }

  setData(data: Buffer, key?: Buffer): void {
    if (key) {
      const encryptedData = AESUtil.aesEncrypt(data, key);
      if (encryptedData != false) {
        this.data = encryptedData;
      }
    } else {
      this.data = CodecUtils.encodeWithEncrypt(data, this.encrypt);
    }
  }

  getData(key?: Buffer): Buffer | false {
    if (this.data != null) {
      if (key) {
        return AESUtil.aesDecrypt(this.data, key);
      } else {
        return CodecUtils.decodeWithEncrypt(this.data, this.encrypt);
      }
    }
    return false;
  }
}