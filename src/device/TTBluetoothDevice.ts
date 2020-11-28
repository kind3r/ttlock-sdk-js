'use strict';

import { Command } from "../api/Command";
import { LockType, LockVersion } from "../constant/Lock";
import { DeviceInterface, ServiceInterface } from "../scanner/DeviceInterface";
import { sleep } from "../util/Timing";
import { TTDevice } from "./TTDevice";

const CRLF = "0d0a";
const MTU = 20;

export declare interface TTBluetoothDevice {
  on(event: "connected", listener: () => void): this;
  on(event: "disconnected", listener: () => void): this;
  on(event: "dataReceived", listener: (command: Command) => void): this;
}

export class TTBluetoothDevice extends TTDevice implements TTBluetoothDevice {
  device?: DeviceInterface;
  connected: boolean = false;
  incomingDataBuffer: Buffer = Buffer.from([]);
  private waitingForResponse: boolean = false;
  private responses: Command[] = [];

  private constructor() {
    super();
  }

  static createFromDevice(device: DeviceInterface): TTBluetoothDevice {
    const bDevice = new TTBluetoothDevice();
    bDevice.id = device.id;
    bDevice.updateFromDevice(device);
    return bDevice;
  }

  updateFromDevice(device: DeviceInterface): boolean {
    // just check if we are updating the same device
    if (this.id == device.id) {
      this.device = device;
      this.name = device.name;
      this.rssi = device.rssi;
      if (device.manufacturerData.length >= 15) {
        this.parseManufacturerData(device.manufacturerData);
      }
      this.device.on("connected", this.onDeviceConnected.bind(this));
      this.device.on("disconnected", this.onDeviceDisconnected.bind(this));
      return true;
    }
    return false;
  }

  async connect(): Promise<boolean> {
    if (this.device?.connectable) {
      if (await this.device?.connect()) {
        await this.readBasicInfo();
        await this.subscribe();
        this.connected = true;
        this.emit("connected");
        return true;
      }
    }
    return false;
  }

  private async onDeviceConnected() {
    // await this.readBasicInfo();
    // await this.subscribe();
    // this.connected = true;
    // this.emit("connected");
  }

  private async onDeviceDisconnected() {
    this.connected = false;
    this.emit("disconnect");
  }

  private async readBasicInfo() {
    await this.device?.discoverServices();
    // update some basic information
    let service = this.device?.services.get("1800");
    if (typeof service != "undefined") {
      await service.readCharacteristics();
      this.putCharacteristicValue(service, "2a00", "name");
    }
    service = this.device?.services.get("180a");
    if (typeof service != "undefined") {
      await service.readCharacteristics();
      this.putCharacteristicValue(service, "2a29", "manufacturer");
      this.putCharacteristicValue(service, "2a24", "model");
      this.putCharacteristicValue(service, "2a27", "hardware");
      this.putCharacteristicValue(service, "2a26", "firmware");
    }
  }

  private async subscribe() {
    let service = this.device?.services.get("1910");
    if (typeof service != "undefined") {
      const characteristic = service.characteristics.get("fff4");
      if (typeof characteristic != "undefined") {
        characteristic.subscribe();
        characteristic.on("dataRead", this.onIncomingData.bind(this));
      }
    }
  }

  async sendCommand(command: Command, waitForResponse: boolean = true): Promise<Command | void> {
    if (this.waitingForResponse) {
      throw new Error("Command already in progress");
    }
    if (this.responses.length > 0) {
      // should this be an error ?
      throw new Error("Unprocessed responses");
    }
    const commandData = command.buildCommand();
    if (commandData) {
      let data = Buffer.concat([
        commandData,
        Buffer.from(CRLF, "hex")
      ]);
      // write with 20 bytes MTU
      const service = this.device?.services.get("1910");
      if (typeof service != undefined) {
        const characteristic = service?.characteristics.get("fff2");
        if (typeof characteristic != "undefined") {
          let index = 0;
          if (waitForResponse) {
            this.waitingForResponse = true;
          }
          console.log("Sending command:", data.toString("hex"));
          do {
            const remaining = data.length - index;
            await characteristic?.write(data.subarray(index, index + Math.min(MTU, remaining) + 1), true);
            await sleep(50);
            index += MTU;
          } while (index < data.length);
        }
        // wait for a response
        if (waitForResponse) {
          console.log("Waiting for response");
          let cycles = 0;
          while (this.responses.length == 0) {
            cycles++;
            await sleep(100);
          }
          console.log("Waited for a response for", cycles, "=", cycles * 100, "ms");
          const response = this.responses.pop();
          if (this.responses.length > 0) {
            console.error("There are still unprocessed responses !!!");
          }
          return response;
        }
      }
    }
  }

  private onIncomingData(data: Buffer) {
    console.log("Received data:", data.toString("hex"));
    this.incomingDataBuffer = Buffer.concat([this.incomingDataBuffer, data]);
    console.log("Incoming data buffer:", this.incomingDataBuffer.toString("hex"));
    this.readDeviceResponse();
  }

  private readDeviceResponse() {
    if (this.incomingDataBuffer.length >= 2) {
      // check for CRLF at the end of data
      const ending = this.incomingDataBuffer.subarray(this.incomingDataBuffer.length - 2);
      if (ending.toString("hex") == CRLF) {
        // we have a command response
        try {
          const command = Command.createFromRawData(this.incomingDataBuffer.subarray(0, this.incomingDataBuffer.length - 2));
          if (this.waitingForResponse) {
            this.responses.push(command);
          } else {
            this.emit("dataReceived", command);
          }
        } catch (error) {
          console.error(error);
        }
        this.incomingDataBuffer = Buffer.from([]);
      }
    }
  }

  private putCharacteristicValue(service: ServiceInterface, uuid: string, property: string) {
    const value = service.characteristics.get(uuid);
    if (typeof value != "undefined" && typeof value.lastValue != "undefined") {
      Reflect.set(this, property, value.lastValue.toString());
    }
  }

  async disconnect() {
    if (await this.device?.disconnect()) {
      this.connected = false;
    }
  }

  parseManufacturerData(manufacturerData: Buffer) {
    // TODO: check offset is within the limits of the Buffer
    // console.log(manufacturerData, manufacturerData.length)
    if (manufacturerData.length < 15) {
      throw new Error("Invalid manufacturer data length:" + manufacturerData.length.toString());
    }
    var offset = 0;
    this.protocolType = manufacturerData.readInt8(offset++);
    this.protocolVersion = manufacturerData.readInt8(offset++);
    if (this.protocolType == 18 && this.protocolVersion == 25) {
      this.isDfuMode = true;
      return;
    }
    if (this.protocolType == -1 && this.protocolVersion == -1) {
      this.isDfuMode = true;
      return;
    }
    if (this.protocolType == 52 && this.protocolVersion == 18) {
      this.isWristband = true;
    }
    if (this.protocolType == 5 && this.protocolVersion == 3) {
      this.scene = manufacturerData.readInt8(offset++);
    } else {
      offset = 4;
      this.protocolType = manufacturerData.readInt8(offset++);
      this.protocolVersion = manufacturerData.readInt8(offset++);
      offset = 7;
      this.scene = manufacturerData.readInt8(offset++);
    }
    if (this.protocolType < 5 || LockVersion.getLockType(this) == LockType.LOCK_TYPE_V2S) {
      this.isRoomLock = true;
      return;
    }
    if (this.scene <= 3) {
      this.isRoomLock = true;
    } else {
      switch (this.scene) {
        case 4: {
          this.isGlassLock = true;
          break;
        }
        case 5:
        case 11: {
          this.isSafeLock = true;
          break;
        }
        case 6: {
          this.isBicycleLock = true;
          break;
        }
        case 7: {
          this.isLockcar = true;
          break;
        }
        case 8: {
          this.isPadLock = true;
          break;
        }
        case 9: {
          this.isCyLinder = true;
          break;
        }
        case 10: {
          if (this.protocolType == 5 && this.protocolVersion == 3) {
            this.isRemoteControlDevice = true;
            break;
          }
          break;
        }
      }
    }
    const params = manufacturerData.readInt8(offset);
    this.isUnlock = ((params & 0x1) == 0x1);
    this.isSettingMode = ((params & 0x4) != 0x0);
    if (LockVersion.getLockType(this) == LockType.LOCK_TYPE_V3 || LockVersion.getLockType(this) == LockType.LOCK_TYPE_V3_CAR) {
      this.isTouch = ((params && 0x8) != 0x0);
    } else if (LockVersion.getLockType(this) == LockType.LOCK_TYPE_CAR) {
      this.isTouch = false;
      this.isLockcar = true;
    }
    if (this.isLockcar) {
      if (this.isUnlock) {
        if ((params & 0x10) == 0x1) {
          this.parkStatus = 3;
        } else {
          this.parkStatus = 2;
        }
      } else if ((params & 0x10) == 0x1) {
        this.parkStatus = 1;
      } else {
        this.parkStatus = 0;
      }
    }
    offset++;
    this.batteryCapacity = manufacturerData.readInt8(offset);
    // offset += 3 + 4; // Offset in original SDK is + 3, but in scans it's actually +4
    offset = manufacturerData.length - 6; // let's just get the last 6 bytes
    const macBuf = manufacturerData.slice(offset, offset + 6);
    var macArr: string[] = [];
    macBuf.forEach((m: number) => {
      macArr.push(m.toString(16));
    });
    macArr.reverse();
    this.address = macArr.join(':').toUpperCase();
  }


}