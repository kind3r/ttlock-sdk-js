'use strict';

import { Descriptor } from "@abandonware/noble";
import { DescriptorInterface } from "./DeviceInterface";
import { NobleDevice } from "./NobleDevice";

export class NobleDescriptor implements DescriptorInterface {
  uuid: string;
  name?: string | undefined;
  type?: string | undefined;
  lastValue?: Buffer;
  private device: NobleDevice;
  private descriptor: Descriptor;

  constructor(device: NobleDevice, descriptor: Descriptor) {
    this.device = device;
    this.descriptor = descriptor;
    this.uuid = descriptor.uuid;
    this.name = descriptor.name;
    this.type = descriptor.type;
  }

  async readValue(): Promise<Buffer | undefined> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }
    try {
      this.lastValue = await this.descriptor.readValueAsync();
    } catch (error) {
      console.error(error);
    }
    this.device.resetBusy();
    return this.lastValue;
  }

  async writeValue(data: Buffer): Promise<void> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }

    this.device.resetBusy();
    throw new Error("Method not implemented.");
  }

  toJSON(asObject: boolean = false) {
    const json = {
      uuid: this.uuid,
      name: this.name,
      type: this.type
    }

    if (asObject) {
      return json;
    } else {
      return JSON.stringify(json);
    }
  }

  toString(): string {
    return this.descriptor.toString();
  }
}