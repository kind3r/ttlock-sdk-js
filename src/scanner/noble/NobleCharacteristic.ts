'use strict';

import { Characteristic } from "@abandonware/noble";
import { EventEmitter } from "events";
import { CharacteristicInterface, DescriptorInterface } from "../DeviceInterface";
import { NobleDescriptor } from "./NobleDescriptor";
import { NobleDevice } from "./NobleDevice";

export class NobleCharacteristic extends EventEmitter implements CharacteristicInterface {
  uuid: string;
  name?: string | undefined;
  type?: string | undefined;
  properties: string[];
  isReading: boolean = false;
  lastValue?: Buffer;
  descriptors: Map<string, NobleDescriptor> = new Map();
  private device: NobleDevice;
  private characteristic: Characteristic;

  constructor(device: NobleDevice, characteristic: Characteristic) {
    super();
    this.device = device;
    this.characteristic = characteristic;
    this.uuid = characteristic.uuid;
    this.name = characteristic.name;
    this.type = characteristic.type;
    this.properties = characteristic.properties;
    this.characteristic.on("read", this.onRead.bind(this));
  }

  async discoverDescriptors(): Promise<Map<string, DescriptorInterface>> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }
    try {
      const descriptors = await this.characteristic.discoverDescriptorsAsync();
      this.descriptors = new Map();
      descriptors.forEach((descriptor) => {
        this.descriptors.set(descriptor.uuid, new NobleDescriptor(this.device, descriptor));
      });
    } catch (error) {
      console.error(error);
    }
    this.device.resetBusy();
    return this.descriptors;
  }

  async read(): Promise<Buffer | undefined> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }
    this.isReading = true;
    try {
      this.lastValue = await this.characteristic.readAsync();
    } catch (error) {
      console.error(error);
    }
    this.isReading = false;
    this.device.resetBusy();
    return this.lastValue;
  }

  async write(data: Buffer, withoutResponse: boolean): Promise<void> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }

    await this.characteristic.writeAsync(data, withoutResponse);

    this.device.resetBusy();
  }

  async subscribe(): Promise<void> {
    await this.characteristic.subscribeAsync();
    // await this.characteristic.notifyAsync(true);
  }

  private onRead(data: Buffer) {
    // if the read notification comes from a manual read, just ignore it
    // we are only interested in data pushed by the device
    if (!this.isReading) {
      this.lastValue = data;
      this.emit("dataRead", this.lastValue);
    }
  }

  toJSON(asObject: boolean): string | Object {
    let json: Record<string, any> = {
      uuid: this.uuid,
      name: this.name,
      type: this.type,
      properties: this.properties,
      value: this.lastValue?.toString("hex"),
      descriptors: {}
    }
    this.descriptors.forEach((descriptor) => {
      json.descriptors[this.uuid] = this.toJSON(true);
    });

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(json);
    }
  }

  toString(): string {
    return this.characteristic.toString();
  }
}