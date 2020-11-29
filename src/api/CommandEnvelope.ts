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
  private data: Buffer = Buffer.from([]);
  private lockType: LockType = LockType.UNKNOWN;
  private aesKey?: Buffer;
  private command?: Command;

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
    if (command.protocol_type >= 5) { //New agreement 
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
    // const crc = CodecUtils.crccompute(rawData.slice(0, rawData.length - 1));
    // console.log(rawData.readUInt8(rawData.length - 1), crc);
    // check CRC
    if (rawData.readUInt8(rawData.length - 1) != CodecUtils.crccompute(rawData.slice(0, rawData.length - 1))) {
      throw new Error("CRC error (" + rawData.readUInt8(rawData.length - 1) + " != " + CodecUtils.crccompute(rawData.slice(0, rawData.length - 1)) + ")");
    }
    command.generateLockType();

    if (typeof aesKey != "undefined") {
      command.aesKey = aesKey;
      command.generateCommand();
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
    this.generateCommand();
  }

  setLockType(lockType: LockType) {
    this.lockType = lockType;
  }

  getLockType(): LockType {
    return this.lockType;
  }

  setCommandType(command: CommandType) {
    this.commandType = command;
    this.generateCommand();
  }

  getCommandType(): CommandType {
    return this.commandType;
  }

  getCommand(): Command {
    if (this.command) {
      return this.command;
    } else {
      throw new Error("Command has not been generated");
    }
  }

  // private setData(data: Buffer): void {
  //   if (this.aesKey) {
  //     this.data = AESUtil.aesEncrypt(data, this.aesKey);
  //   } else {
  //     this.data = CodecUtils.encodeWithEncrypt(data, this.encrypt);
  //   }
  // }

  private getData(): Buffer {
    if (this.aesKey) {
      return AESUtil.aesDecrypt(this.data, this.aesKey);
    } else {
      return CodecUtils.decodeWithEncrypt(this.data, this.encrypt);
    }
  }

  buildCommandBuffer(): Buffer {
    if (typeof this.command == "undefined") {
      throw new Error("Command has not been generated");
    }
    if (typeof this.aesKey == "undefined") {
      throw new Error("AES key has not been set");
    }

    const org = new Int16Array(2);
    org[0] = this.organization;
    org[1] = this.sub_organization;
    const data = this.command.build();
    const encryptedData = AESUtil.aesEncrypt(data, this.aesKey);

    let command = Buffer.concat([
      this.header,
      Buffer.from([
        this.protocol_type,
        this.sub_version,
        this.scene
      ]),
      Buffer.from(org.buffer),
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
    if (this.commandType != -1 && this.aesKey) {
      // only generate if no command exists
      if (typeof this.command == "undefined") {
        if (this.data.length > 0) {
          // create a new command using data
          // this is used for receiving command responses or notifications from the lock
          this.command = commandFromData(this.getData());
        } else {
          // create a new blank command from the current commandType
          // this is used for sending commands to the lock
          this.command = commandFromType(this.commandType);
        }
      }
    }
  }
}