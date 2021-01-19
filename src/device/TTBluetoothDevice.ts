'use strict';

import { CommandEnvelope } from "../api/CommandEnvelope";
import { LockType, LockVersion } from "../constant/Lock";
import { CharacteristicInterface, DeviceInterface, ServiceInterface } from "../scanner/DeviceInterface";
import { sleep } from "../util/timingUtil";
import { TTDevice } from "./TTDevice";

const CRLF = "0d0a";
const MTU = 20;

export interface TTBluetoothDevice {
  on(event: "connected", listener: () => void): this;
  on(event: "disconnected", listener: () => void): this;
  on(event: "dataReceived", listener: (command: CommandEnvelope) => void): this;
}

export class TTBluetoothDevice extends TTDevice implements TTBluetoothDevice {
  device?: DeviceInterface;
  connected: boolean = false;
  incomingDataBuffer: Buffer = Buffer.from([]);
  private waitingForResponse: boolean = false;
  private responses: CommandEnvelope[] = [];

  private constructor() {
    super();
  }

  static createFromDevice(device: DeviceInterface): TTBluetoothDevice {
    const bDevice = new TTBluetoothDevice();
    bDevice.updateFromDevice(device);
    return bDevice;
  }

  updateFromDevice(device?: DeviceInterface): void {
    if (typeof device != "undefined") {
      if (typeof this.device != "undefined") {
        this.device.removeAllListeners();
      }
      this.device = device;
      this.device.on("connected", this.onDeviceConnected.bind(this));
      this.device.on("disconnected", this.onDeviceDisconnected.bind(this));
    }

    if (typeof this.device != "undefined") {
      this.id = this.device.id;
      this.name = this.device.name;
      this.rssi = this.device.rssi;
      if (this.device.manufacturerData.length >= 15) {
        this.parseManufacturerData(this.device.manufacturerData);
      }
    }
  }

  async connect(): Promise<boolean> {
    if (this.device && this.device.connectable) {
      if (await this.device.connect()) {
        // TODO: something happens here (disconnect) and it's stuck in limbo
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
    // console.log("TTBluetoothDevice connected", this.device?.id);
  }

  private async onDeviceDisconnected() {
    this.connected = false;
    // console.log("TTBluetoothDevice disconnected", this.device?.id);
    this.emit("disconnected");
  }

  private async readBasicInfo() {
    if (typeof this.device != "undefined") {
      await this.device.discoverServices();
      // update some basic information
      let service: ServiceInterface | undefined;
      if (this.device.services.has("1800")) {
        service = this.device.services.get("1800");
        if (typeof service != "undefined") {
          await service.readCharacteristics();
          this.putCharacteristicValue(service, "2a00", "name");
        }
      }
      if (this.device.services.has("180a")) {
        service = this.device.services.get("180a");
        if (typeof service != "undefined") {
          await service.readCharacteristics();
          this.putCharacteristicValue(service, "2a29", "manufacturer");
          this.putCharacteristicValue(service, "2a24", "model");
          this.putCharacteristicValue(service, "2a27", "hardware");
          this.putCharacteristicValue(service, "2a26", "firmware");
        }
      }
    }
  }

  private async subscribe() {
    if (typeof this.device != "undefined") {
      let service: ServiceInterface | undefined;
      if (this.device.services.has("1910")) {
        service = this.device.services.get("1910");
      }
      if (typeof service != "undefined") {
        await service.readCharacteristics();
        if (service.characteristics.has("fff4")) {
          const characteristic = service.characteristics.get("fff4");
          if (typeof characteristic != "undefined") {
            await characteristic.subscribe();
            characteristic.on("dataRead", this.onIncomingData.bind(this));
            // does not seem to be required
            // await characteristic.discoverDescriptors();
            // const descriptor = characteristic.descriptors.get("2902");
            // if (typeof descriptor != "undefined") {
            //   console.log("Subscribing to descriptor notifications");
            //   await descriptor.writeValue(Buffer.from([0x01, 0x00])); // BE
            //   // await descriptor.writeValue(Buffer.from([0x00, 0x01])); // LE
            // }
          }
        }
      }
    }
  }

  async sendCommand(command: CommandEnvelope, waitForResponse: boolean = true, ignoreCrc: boolean = false): Promise<CommandEnvelope | void> {
    if (this.waitingForResponse) {
      throw new Error("Command already in progress");
    }
    if (this.responses.length > 0) {
      // should this be an error ?
      throw new Error("Unprocessed responses");
    }
    const commandData = command.buildCommandBuffer();
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
          if (waitForResponse) {
            let retry = 0;
            let response: CommandEnvelope | undefined;
            this.waitingForResponse = true;
            do {
              if (retry > 0) {
                // wait a bit before retry
                // console.log("Sleeping a bit");
                await sleep(200);
              }
              const written = await this.writeCharacteristic(characteristic, data);
              if (!written) {
                this.waitingForResponse = false;
                // make sure we clear response buffer as a response could still have been
                // received between writing packets (before lock disconnects, on unstable network) 
                this.responses = [];
                throw new Error("Unable to send data to lock");
              }
              // wait for a response
              // console.log("Waiting for response");
              let cycles = 0;
              while (this.responses.length == 0 && this.connected) {
                cycles++;
                await sleep(5);
              }
              // console.log("Waited for a response for", cycles, "=", cycles * 5, "ms");
              if (!this.connected) {
                this.waitingForResponse = false;
                this.responses = [];
                throw new Error("Disconnected while waiting for response");
              }
              response = this.responses.pop();
              retry++;
            } while (typeof response == "undefined" || (!response.isCrcOk() && !ignoreCrc && retry <= 2));
            this.waitingForResponse = false;
            if (!response.isCrcOk() && !ignoreCrc) {
              if (process.env.TTLOCK_IGNORE_CRC == "1") {
                console.error("Malformed response, bad CRC, ignoring");
              } else {
                throw new Error("Malformed response, bad CRC");
              }
            }
            return response;
          } else {
            await this.writeCharacteristic(characteristic, data);
          }
        }
      }
    }
  }

  /**
   * 
   * @param timeout Timeout to wait in ms
   */
  async waitForResponse(timeout: number = 10000): Promise<CommandEnvelope | undefined> {
    if (this.waitingForResponse) {
      throw new Error("Command already in progress");
    }
    let response: CommandEnvelope | undefined;
    this.waitingForResponse = true;

    console.log("Waiting for response");
    let cycles = 0;
    const sleepPerCycle = 100;
    while (this.responses.length == 0 && cycles * sleepPerCycle < timeout) {
      cycles++;
      await sleep(sleepPerCycle);
    }
    console.log("Waited for a response for", cycles, "=", cycles * sleepPerCycle, "ms");

    if (this.responses.length > 0) {
      response = this.responses.pop();
    }
    this.waitingForResponse = false;
    return response;
  }

  private async writeCharacteristic(characteristic: CharacteristicInterface, data: Buffer): Promise<boolean> {
    if (process.env.TTLOCK_DEBUG_COMM == "1") {
      console.log("Sending command:", data.toString("hex"));
    }
    let index = 0;
    do {
      const remaining = data.length - index;
      const written = await characteristic.write(data.subarray(index, index + Math.min(MTU, remaining)), true);
      if (!written) {
        return false;
      }
      // await sleep(10);
      index += MTU;
    } while (index < data.length);
    return true;
  }

  private onIncomingData(data: Buffer) {
    this.incomingDataBuffer = Buffer.concat([this.incomingDataBuffer, data]);
    this.readDeviceResponse();
  }

  private readDeviceResponse() {
    if (this.incomingDataBuffer.length >= 2) {
      // check for CRLF at the end of data
      const ending = this.incomingDataBuffer.subarray(this.incomingDataBuffer.length - 2);
      if (ending.toString("hex") == CRLF) {
        // we have a command response
        if (process.env.TTLOCK_DEBUG_COMM == "1") {
          console.log("Received response:", this.incomingDataBuffer.toString("hex"));
        }
        try {
          const command = CommandEnvelope.createFromRawData(this.incomingDataBuffer.subarray(0, this.incomingDataBuffer.length - 2));
          if (this.waitingForResponse) {
            this.responses.push(command);
          } else {
            // discard unsolicited messages if CRC is not ok
            if (command.isCrcOk()) {
              this.emit("dataReceived", command);
            }
          }
        } catch (error) {
          // TODO: in case of a malformed response we should notify the waiting cycle and stop waiting
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