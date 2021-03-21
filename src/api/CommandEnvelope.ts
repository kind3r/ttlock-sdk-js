'use strict';

import { CommandType } from "../constant/CommandType";
import { CodecUtils } from "../util/CodecUtils";
import { LockType, LockVersion } from "../constant/Lock";
import { AESUtil } from "../util/AESUtil";
import { Command } from "./Command";
import { commandFromData, commandFromType } from "./commandBuilder";

const DEFAULT_HEADER = Buffer.from([0x7F, 0x5A]);

export class CommandEnvelope {
  static APP_COMMAND: number = 0xaa;
  private header: Buffer = DEFAULT_HEADER;
  private protocol_type: number = -1;
  private sub_version: number = -1;
  private scene: number = -1;
  private organization: number = -1;
  private sub_organization: number = -1;
  private commandType: CommandType = -1;
  private encrypt: number = 0;
  private data?: Buffer;
  private lockType: LockType = LockType.UNKNOWN;
  private aesKey?: Buffer;
  private command?: Command;
  private crc: number = -1;
  private crcok: boolean = true;

  /**
   * Create a command from raw data usually received from characteristic change
   * @param rawData 
   */
  static createFromRawData(rawData: Buffer, aesKey?: Buffer): CommandEnvelope {
    const command = new CommandEnvelope();
    if (rawData.length < 7) {
      throw new Error("Data too short");
    }
    command.header = rawData.subarray(0, 2);
    command.protocol_type = rawData.readInt8(2);
    if (command.protocol_type >= 5 || command.protocol_type == 0) { //New agreement 
      if (rawData.length < 13) {
        throw new Error("New agreement data too short");
      }
      command.sub_version = rawData.readInt8(3);
      command.scene = rawData.readInt8(4);
      command.organization = rawData.readInt16BE(5); // or readInt16LE ?
      command.sub_organization = rawData.readInt16BE(7);
      command.commandType = rawData.readUInt8(9);
      command.encrypt = rawData.readInt8(10);
      const length = rawData.readInt8(11);
      if (length < 0 || rawData.length < 12 + length + 1) { // header + data + crc 
        throw new Error("Invalid data length");
      }
      if (length > 0) {
        command.data = rawData.subarray(12, 12 + length);
      } else {
        command.data = Buffer.from([]);
      }
    } else {
      command.commandType = rawData.readUInt8(3);
      command.encrypt = rawData.readInt8(4);
      const length = rawData.readInt8(5);
      if (length < 0 || rawData.length < 6 + length + 1) {
        throw new Error("Invalid data length");
      }
      command.data = rawData.subarray(6, 6 + length);
    }
    // check CRC
    const crc = CodecUtils.crccompute(rawData.slice(0, rawData.length - 1));
    command.crc = rawData.readUInt8(rawData.length - 1);
    if (command.crc != crc) {
      console.log("Bad CRC should be " + crc + " and we got " + command.crc);
      command.crcok = false;
    }
    command.generateLockType();

    if (typeof aesKey != "undefined") {
      command.aesKey = aesKey;
      // command.generateCommand();
    }

    return command;
  }

  /**
   * Create new command starting from the version of the device
   * @param lockVersion 
   */
  static createFromLockVersion(lockVersion: LockVersion, aesKey?: Buffer): CommandEnvelope {
    const command = new CommandEnvelope;
    command.header = DEFAULT_HEADER;
    command.protocol_type = lockVersion.getProtocolType();
    command.sub_version = lockVersion.getProtocolVersion();
    command.scene = lockVersion.getScene();
    command.organization = lockVersion.getGroupId();
    command.sub_organization = lockVersion.getOrgId();
    command.encrypt = CommandEnvelope.APP_COMMAND;
    command.generateLockType();
    if (aesKey) {
      command.setAesKey(aesKey);
    }
    return command;
  }

  static createFromLockType(lockType: LockType, aesKey?: Buffer): CommandEnvelope {
    const lockVersion = LockVersion.getLockVersion(lockType);
    if (lockVersion != null) {
      const command = CommandEnvelope.createFromLockVersion(lockVersion, aesKey);
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

  setAesKey(aesKey: Buffer) {
    this.aesKey = aesKey;
    // this.generateCommand();
  }

  setLockType(lockType: LockType) {
    this.lockType = lockType;
  }

  getLockType(): LockType {
    return this.lockType;
  }

  setCommandType(command: CommandType) {
    // if (typeof command == "string") {
    //   command = command.charCodeAt(0);
    // }
    this.commandType = command;
    // this.generateCommand();
  }

  getCommandType(): CommandType {
    return this.commandType;
  }

  getCommand(): Command {
    this.generateCommand();
    if (this.command) {
      return this.command;
    } else {
      throw new Error("Command has not been generated");
    }
  }

  getCrc(): number {
    return this.crc;
  }

  isCrcOk(): boolean {
    if (process.env.TTLOCK_IGNORE_CRC == "1") {
      return true;
    }
    return this.crcok;
  }

  private getData(): Buffer {
    if (this.data) {
      if (this.aesKey) {
        return AESUtil.aesDecrypt(this.data, this.aesKey);
      } else {
        return CodecUtils.decodeWithEncrypt(this.data, this.encrypt);
      }
    } else {
      throw new Error("No data");
    }
  }

  buildCommandBuffer(): Buffer {
    this.generateCommand();
    if (typeof this.command == "undefined") {
      throw new Error("Command has not been generated");
    }

    const data = this.command.build();
    if (typeof this.aesKey == "undefined" && data.length > 0) {
      throw new Error("AES key has not been set");
    }

    const org = new ArrayBuffer(4);
    const dataView = new DataView(org);
    dataView.setInt16(0, this.organization, false); // Bin Endian
    dataView.setInt16(2, this.sub_organization, false); // Bin Endian

    let encryptedData: Buffer;
    // if there is no data we don't need to encrypt it
    if (data.length > 0) {
      encryptedData = AESUtil.aesEncrypt(data, this.aesKey);
    } else {
      encryptedData = data;
    }

    let command = Buffer.concat([
      this.header,
      Buffer.from([
        this.protocol_type,
        this.sub_version,
        this.scene
      ]),
      Buffer.from(org),
      Buffer.from([
        this.commandType,
        this.encrypt,
        encryptedData.length
      ]),
      encryptedData
    ]);

    const crc = CodecUtils.crccompute(command);
    command = Buffer.concat([
      command,
      Buffer.from([crc])
    ]);

    return command;
  }

  /**
   * Generate the command from the commandType and data
   * 
   * Command should be built when
   * - creating the envelope from data (received command/response) but only after having the aesKey
   * - creating a new envelope and we have the commandType and aesKey
   * 
   */
  private generateCommand() {
    if (this.commandType != -1 && typeof this.command == "undefined") {
      // only generate if no command exists
      if (typeof this.data != "undefined") {
        if (this.data.length > 0 && typeof this.aesKey != "undefined") {
          // create a new command using data
          // this is used for receiving command responses or notifications from the lock
          this.command = commandFromData(this.getData());
        }
      } else {
        // create a new blank command from the current commandType
        // this is used for sending commands to the lock
        this.command = commandFromType(this.commandType);
      }
    }
  }

  clearLockData() {
    this.lockType = 0;
    this.protocol_type = 0;
    this.sub_version = 0;
    this.scene = 0;
    this.organization = 0;
    this.sub_organization = 0;
    this.encrypt = 0x55;
  }
}