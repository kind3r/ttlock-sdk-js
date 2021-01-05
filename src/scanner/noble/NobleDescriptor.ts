'use strict';

import { Descriptor } from "@abandonware/noble";
import { EventEmitter } from "events";
import { DescriptorInterface } from "../DeviceInterface";
import { NobleDevice } from "./NobleDevice";

export class NobleDescriptor extends EventEmitter implements DescriptorInterface {
  uuid: string;
  name?: string | undefined;
  type?: string | undefined;
  isReading: boolean = false;
  lastValue?: Buffer;
  private device: NobleDevice;
  private descriptor: Descriptor;

  constructor(device: NobleDevice, descriptor: Descriptor) {
    super();
    this.device = device;
    this.descriptor = descriptor;
    this.uuid = descriptor.uuid;
    this.name = descriptor.name;
    this.type = descriptor.type;
    this.descriptor.on("valueRead", this.onRead.bind(this));
  }

  async readValue(): Promise<Buffer | undefined> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }
    this.isReading = true;
    try {
      this.lastValue = await this.descriptor.readValueAsync();
    } catch (error) {
      console.error(error);
    }
    this.isReading = false;
    this.device.resetBusy();
    return this.lastValue;
  }

  async writeValue(data: Buffer): Promise<void> {
    this.device.checkBusy();
    if (!this.device.connected) {
      this.device.resetBusy();
      throw new Error("NobleDevice is not connected");
    }

    await this.descriptor.writeValueAsync(data);
    this.lastValue = data;

    this.device.resetBusy();
  }

  private onRead(data: Buffer) {
    // if the read notification comes from a manual read, just ignore it
    // we are only interested in data pushed by the device
    if (!this.isReading) {
      this.lastValue = data;
      console.log("Descriptor received data", data);
      this.emit("valueRead", this.lastValue);
    }
  }

  toJSON(asObject: boolean = false) {
    const json = {
      uuid: this.uuid,
      name: this.name,
      type: this.type,
      value: this.lastValue?.toString("hex")
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